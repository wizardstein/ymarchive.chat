import JSZip from "jszip";
import { cacheGet, cachePut } from "./cache";
import { decodeDatFile } from "./decoder";
import type {
  ProcessingProgress,
  YMConversation,
  YMMessage,
  YMProfile,
} from "./types";

type ProgressCb = (p: ProcessingProgress) => void;

// How many files to read concurrently. Browsers cap file-handle parallelism
// anyway; 16 is a good balance: fast on modern laptops, still friendly on
// low-end machines.
const READ_CONCURRENCY = 16;

// Minimum interval between progress callbacks during the decode loop — keeps
// React from re-rendering thousands of times for large archives.
const PROGRESS_MIN_INTERVAL_MS = 100;

/**
 * Abstract representation of a file inside the archive — either a zip entry
 * or a plain File picked from a folder upload.
 */
export interface SourceEntry {
  path: string;
  getBytes(): Promise<Uint8Array>;
  getText(): Promise<string>;
}

// Matches .../<user>/Archive/Messages/<peer>/<file>.dat, with any number of
// leading folder segments. The outer folder may be "Profiles", "profiles1",
// "backup-2007", or anything else — we anchor on Archive/Messages, which is
// the actual structural marker Yahoo! Messenger wrote.
const DAT_PATH_RE =
  /(?:^|\/)([^/]+)\/Archive\/Messages\/([^/]+)\/([^/]+)\.dat$/i;

// Fallback: the user picked a partial subtree (e.g. the Archive/ folder or
// the Messages/ folder directly), so the path doesn't have a username
// segment above Archive. Yahoo's own filename convention is
// YYYYMMDD-<username>.dat, which lets us recover the local username from
// the filename alone.
const DAT_FALLBACK_RE =
  /(?:^|\/)Messages\/([^/]+)\/(\d{6,8})-([^/]+?)\.dat$/i;

const ICON_INDEX_RE = /(?:^|\/)([^/]+)\/My Icons\/Index\.ini$/i;

const ICON_IMAGE_RE =
  /(?:^|\/)([^/]+)\/My Icons\/([^/]+\.(?:png|jpg|jpeg|gif|bmp))$/i;

// Fallback avatars (no username segment above "My Icons").
const ICON_INDEX_FALLBACK_RE = /(?:^|\/)My Icons\/Index\.ini$/i;
const ICON_IMAGE_FALLBACK_RE =
  /(?:^|\/)My Icons\/([^/]+\.(?:png|jpg|jpeg|gif|bmp))$/i;

interface ProfileAccumulator {
  username: string;
  conversations: Map<string, YMMessage[]>;
  iconIndexRaw?: string;
  iconFiles: Map<string, Uint8Array>;
}

function getOrCreate(
  profiles: Map<string, ProfileAccumulator>,
  username: string,
): ProfileAccumulator {
  let p = profiles.get(username);
  if (!p) {
    p = { username, conversations: new Map(), iconFiles: new Map() };
    profiles.set(username, p);
  }
  return p;
}

function parseIconIndex(ini: string): string[] {
  const entries: Array<{ order: number; basename: string }> = [];
  const lines = ini.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*Icon(\d+)\s*=\s*(.+?)\s*$/i);
    if (!m) continue;
    const order = parseInt(m[1], 10);
    const value = m[2];
    const commaIdx = value.indexOf(",");
    const pathPart = commaIdx >= 0 ? value.slice(0, commaIdx) : value;
    const segments = pathPart.split(/[\\/]/);
    const basename = segments[segments.length - 1]?.trim();
    if (basename) entries.push({ order, basename: basename.toLowerCase() });
  }
  entries.sort((a, b) => a.order - b.order);
  return entries.map((e) => e.basename);
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
    );
  }
  const b64 = typeof btoa !== "undefined" ? btoa(binary) : "";
  return `data:${mime};base64,${b64}`;
}

function mimeForBasename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return "application/octet-stream";
}

function dedupeMessages(messages: YMMessage[]): YMMessage[] {
  if (messages.length < 2) return messages;
  const out: YMMessage[] = [messages[0]];
  for (let i = 1; i < messages.length; i++) {
    const prev = out[out.length - 1];
    const m = messages[i];
    if (
      m.timestamp === prev.timestamp &&
      m.text === prev.text &&
      m.isLocal === prev.isLocal
    ) {
      continue;
    }
    out.push(m);
  }
  return out;
}

/**
 * Run `fn` over `items` with at most `concurrency` promises in flight.
 * Preserves input order.
 */
async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Wrap a progress callback so it fires at most every `intervalMs`. Stage
 * transitions and terminal states ("ready"/"error") always flush immediately.
 */
function throttleProgress(cb: ProgressCb, intervalMs: number): ProgressCb {
  let lastFiredAt = 0;
  let lastStage: ProcessingProgress["stage"] | null = null;
  let pending: ProcessingProgress | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fire = (p: ProcessingProgress) => {
    lastFiredAt = performance.now();
    lastStage = p.stage;
    pending = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    cb(p);
  };

  return (p: ProcessingProgress) => {
    const now = performance.now();
    const stageChanged = p.stage !== lastStage;
    const terminal = p.stage === "ready" || p.stage === "error";
    if (stageChanged || terminal || now - lastFiredAt >= intervalMs) {
      fire(p);
      return;
    }
    pending = p;
    if (!timer) {
      const wait = Math.max(0, intervalMs - (now - lastFiredAt));
      timer = setTimeout(() => {
        timer = null;
        if (pending) fire(pending);
      }, wait);
    }
  };
}

/**
 * Core processing: cache check → detect → parallel decode → avatars → dedupe.
 */
async function processEntries(
  entries: SourceEntry[],
  fingerprint: string | null,
  rawProgress: ProgressCb,
): Promise<YMProfile[]> {
  const onProgress = throttleProgress(rawProgress, PROGRESS_MIN_INTERVAL_MS);

  // Cache fast-path.
  if (fingerprint) {
    const cached = await cacheGet(fingerprint);
    if (cached) {
      onProgress({
        stage: "ready",
        message: "Loaded from cache",
        fromCache: true,
      });
      return cached;
    }
  }

  onProgress({ stage: "detecting", message: "Detecting profiles…" });

  const datEntries: Array<{
    entry: SourceEntry;
    username: string;
    peer: string;
  }> = [];
  const iconIndexEntries: Array<{
    entry: SourceEntry;
    username: string;
  }> = [];
  const iconImageEntries: Array<{
    entry: SourceEntry;
    username: string;
    basename: string;
  }> = [];
  // Avatars found without a username prefix in their path. Attached later
  // when the only discovered profile is unambiguous.
  const fallbackIconIndexEntries: SourceEntry[] = [];
  const fallbackIconImageEntries: Array<{
    entry: SourceEntry;
    basename: string;
  }> = [];

  for (const entry of entries) {
    const datMatch = entry.path.match(DAT_PATH_RE);
    if (datMatch) {
      datEntries.push({ entry, username: datMatch[1], peer: datMatch[2] });
      continue;
    }
    // Fallback: user picked the Archive/ or Messages/ folder directly, so
    // there's no username segment above Archive. Recover the username from
    // the YYYYMMDD-<username>.dat filename convention.
    const datFallback = entry.path.match(DAT_FALLBACK_RE);
    if (datFallback) {
      const peer = datFallback[1];
      const username = datFallback[3];
      if (username && peer) {
        datEntries.push({ entry, username, peer });
        continue;
      }
    }
    const iconIndexMatch = entry.path.match(ICON_INDEX_RE);
    if (iconIndexMatch) {
      iconIndexEntries.push({ entry, username: iconIndexMatch[1] });
      continue;
    }
    const iconImgMatch = entry.path.match(ICON_IMAGE_RE);
    if (iconImgMatch) {
      iconImageEntries.push({
        entry,
        username: iconImgMatch[1],
        basename: iconImgMatch[2],
      });
      continue;
    }
    if (ICON_INDEX_FALLBACK_RE.test(entry.path)) {
      fallbackIconIndexEntries.push(entry);
      continue;
    }
    const iconImgFallback = entry.path.match(ICON_IMAGE_FALLBACK_RE);
    if (iconImgFallback) {
      fallbackIconImageEntries.push({ entry, basename: iconImgFallback[1] });
      continue;
    }
  }

  const total = datEntries.length;
  const profiles = new Map<string, ProfileAccumulator>();

  // Decode .dat files in parallel, accumulating straight into the profile map.
  const startedAt = performance.now();
  let done = 0;

  onProgress({
    stage: "decoding",
    message: `Decoding ${total} message files…`,
    filesDone: 0,
    filesTotal: total,
  });

  await runPool(datEntries, READ_CONCURRENCY, async ({ entry, username, peer }) => {
    const bytes = await entry.getBytes();
    const messages = decodeDatFile(bytes, {
      localUsername: username,
      peerUsername: peer,
    });
    if (messages.length) {
      const profile = getOrCreate(profiles, username);
      const list = profile.conversations.get(peer) ?? [];
      for (const m of messages) list.push(m);
      profile.conversations.set(peer, list);
    }
    done++;
    const elapsedSec = (performance.now() - startedAt) / 1000;
    const ratePerSec = elapsedSec > 0 ? done / elapsedSec : 0;
    const remaining = total - done;
    const etaSeconds =
      ratePerSec > 0 && remaining > 0 ? remaining / ratePerSec : 0;
    onProgress({
      stage: "decoding",
      message: `Decoding ${done}/${total} message files…`,
      filesDone: done,
      filesTotal: total,
      ratePerSec,
      etaSeconds,
    });
  });

  // Fallback icons (no username in path) are only attachable when there's
  // a single unambiguous profile in this upload. Otherwise we can't tell
  // which profile they belong to, so we drop them.
  const soleProfileUsername =
    profiles.size === 1 ? profiles.keys().next().value : null;
  if (soleProfileUsername) {
    for (const entry of fallbackIconIndexEntries) {
      iconIndexEntries.push({ entry, username: soleProfileUsername });
    }
    for (const { entry, basename } of fallbackIconImageEntries) {
      iconImageEntries.push({ entry, username: soleProfileUsername, basename });
    }
  }

  // Avatars — progress-reported so users see activity, and individual
  // read failures are swallowed so one corrupt icon can't hang the stage.
  const avatarTotal = iconIndexEntries.length + iconImageEntries.length;
  let avatarDone = 0;
  const avatarTick = () => {
    avatarDone++;
    onProgress({
      stage: "loading-avatars",
      message: `Loading profile pictures ${avatarDone}/${avatarTotal}…`,
      filesDone: avatarDone,
      filesTotal: avatarTotal,
    });
  };

  onProgress({
    stage: "loading-avatars",
    message:
      avatarTotal > 0
        ? `Loading profile pictures 0/${avatarTotal}…`
        : "No profile pictures found",
    filesDone: 0,
    filesTotal: avatarTotal,
  });

  await runPool(
    iconIndexEntries,
    READ_CONCURRENCY,
    async ({ entry, username }) => {
      try {
        const profile = profiles.get(username);
        if (profile) profile.iconIndexRaw = await entry.getText();
      } catch (e) {
        console.warn("Failed to read icon index", entry.path, e);
      }
      avatarTick();
    },
  );

  await runPool(
    iconImageEntries,
    READ_CONCURRENCY,
    async ({ entry, username, basename }) => {
      try {
        const profile = profiles.get(username);
        if (profile) {
          profile.iconFiles.set(basename.toLowerCase(), await entry.getBytes());
        }
      } catch (e) {
        console.warn("Failed to read icon image", entry.path, e);
      }
      avatarTick();
    },
  );

  // Assemble.
  const assembled: YMProfile[] = [];
  for (const profile of profiles.values()) {
    const conversations: YMConversation[] = [];
    for (const [peer, messages] of profile.conversations.entries()) {
      messages.sort(
        (a, b) =>
          a.timestamp - b.timestamp ||
          (a.isLocal === b.isLocal ? 0 : a.isLocal ? -1 : 1) ||
          (a.text < b.text ? -1 : a.text > b.text ? 1 : 0),
      );
      conversations.push({ peer, messages: dedupeMessages(messages) });
    }
    conversations.sort((a, b) => b.messages.length - a.messages.length);

    const avatarHistory: string[] = [];
    if (profile.iconIndexRaw) {
      const ordered = parseIconIndex(profile.iconIndexRaw);
      for (const basename of ordered) {
        const bytes = profile.iconFiles.get(basename);
        if (bytes) {
          avatarHistory.push(bytesToDataUrl(bytes, mimeForBasename(basename)));
        }
      }
    }
    if (avatarHistory.length === 0 && profile.iconFiles.size > 0) {
      for (const [basename, bytes] of profile.iconFiles.entries()) {
        avatarHistory.push(bytesToDataUrl(bytes, mimeForBasename(basename)));
      }
    }
    const avatarUrl =
      avatarHistory.length > 0 ? avatarHistory[avatarHistory.length - 1] : null;

    assembled.push({
      username: profile.username,
      avatarUrl,
      avatarHistory,
      conversations,
    });
  }

  const nonEmpty = assembled.filter((p) => p.conversations.length > 0);
  nonEmpty.sort((a, b) => {
    const countA = a.conversations.reduce((s, c) => s + c.messages.length, 0);
    const countB = b.conversations.reduce((s, c) => s + c.messages.length, 0);
    return countB - countA;
  });

  // Write cache — best effort, don't block on failure.
  if (fingerprint && nonEmpty.length > 0) {
    cachePut(fingerprint, nonEmpty).catch(() => {});
  }

  onProgress({ stage: "ready", message: "Done" });
  return nonEmpty;
}

async function sha256Hex(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, "0");
  }
  return out;
}

export interface ParseResult {
  profiles: YMProfile[];
  fingerprint: string | null;
}

/**
 * Parse a zip Blob/File.
 */
export async function parseArchive(
  file: File | Blob,
  onProgress: ProgressCb = () => {},
): Promise<ParseResult> {
  onProgress({ stage: "unzipping", message: "Unzipping archive…" });

  // Fingerprint from the zip's own File metadata (no bytes read).
  let fingerprint: string | null = null;
  if (file instanceof File) {
    fingerprint = await sha256Hex(
      `zip|${file.name}|${file.size}|${file.lastModified}`,
    );
  }

  const zip = await JSZip.loadAsync(file);
  const entries: SourceEntry[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    entries.push({
      path: relativePath,
      getBytes: () => zipEntry.async("uint8array"),
      getText: () => zipEntry.async("string"),
    });
  });

  const profiles = await processEntries(entries, fingerprint, onProgress);
  return { profiles, fingerprint };
}

/**
 * Parse a flat list of files produced by a folder upload.
 */
export async function parseFolderEntries(
  files: Array<{ path: string; file: File }>,
  onProgress: ProgressCb = () => {},
): Promise<ParseResult> {
  onProgress({ stage: "unzipping", message: "Reading folder contents…" });

  // Fingerprint from per-file metadata (no bytes read).
  const rows = files
    .map(({ path, file }) => `${path}|${file.size}|${file.lastModified}`)
    .sort();
  const fingerprint = await sha256Hex(`folder|${rows.join("\n")}`);

  const entries: SourceEntry[] = files.map(({ path, file }) => ({
    path,
    getBytes: async () => new Uint8Array(await file.arrayBuffer()),
    getText: () => file.text(),
  }));

  const profiles = await processEntries(entries, fingerprint, onProgress);
  return { profiles, fingerprint };
}
