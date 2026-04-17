// Past-sessions index stored in localStorage. Each entry is a pointer to a
// parsed archive that's cached in IndexedDB via lib/cache.ts — the heavy
// data stays there; here we just store the fingerprint and whichever
// profile/peer was last open, plus enough metadata to render the "recent
// archives" list on the upload screen.

const KEY = "ym-sessions-v1";
// Old single-session key that used to live here before multi-session. If
// present on first read, we migrate it into the list and remove it.
const LEGACY_KEY = "ym-last-session-v1";

export interface ArchiveSession {
  fingerprint: string;
  label: string;
  profileCount: number;
  totalMessages: number;
  pickedIdx: number | null;
  activePeer: string | null;
  savedAt: number;
  createdAt: number;
}

function readList(): ArchiveSession[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Defensive: drop any entries missing a fingerprint.
        return parsed.filter(
          (s) => s && typeof s.fingerprint === "string",
        ) as ArchiveSession[];
      }
    }
    // Migrate from the legacy single-session entry if present.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const p = JSON.parse(legacy);
      if (p && typeof p.fingerprint === "string") {
        const now = Date.now();
        const s: ArchiveSession = {
          fingerprint: p.fingerprint,
          label: p.label ?? "Archive",
          profileCount: typeof p.profileCount === "number" ? p.profileCount : 1,
          totalMessages:
            typeof p.totalMessages === "number" ? p.totalMessages : 0,
          pickedIdx: p.pickedIdx ?? null,
          activePeer: p.activePeer ?? null,
          savedAt: typeof p.savedAt === "number" ? p.savedAt : now,
          createdAt: typeof p.savedAt === "number" ? p.savedAt : now,
        };
        writeList([s]);
        localStorage.removeItem(LEGACY_KEY);
        return [s];
      }
    }
    return [];
  } catch {
    return [];
  }
}

function writeList(list: ArchiveSession[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota / privacy mode — best effort
  }
}

export function listSessions(): ArchiveSession[] {
  return readList().sort((a, b) => b.savedAt - a.savedAt);
}

export function readLastSession(): ArchiveSession | null {
  return listSessions()[0] ?? null;
}

export function getSession(fingerprint: string): ArchiveSession | null {
  return readList().find((s) => s.fingerprint === fingerprint) ?? null;
}

/**
 * Insert or update a session in the list. If an entry with the same
 * fingerprint already exists, its createdAt is preserved.
 */
export function upsertSession(s: ArchiveSession): void {
  const list = readList();
  const idx = list.findIndex((x) => x.fingerprint === s.fingerprint);
  if (idx >= 0) {
    list[idx] = { ...s, createdAt: list[idx].createdAt };
  } else {
    list.push(s);
  }
  writeList(list);
}

export function removeSession(fingerprint: string): void {
  const list = readList();
  const next = list.filter((s) => s.fingerprint !== fingerprint);
  writeList(next);
}

export function clearAllSessions(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}

export function sessionLabel(profiles: Array<{ username: string }>): string {
  if (profiles.length === 0) return "";
  if (profiles.length === 1) return profiles[0].username;
  return `${profiles[0].username} + ${profiles.length - 1} other${profiles.length - 1 === 1 ? "" : "s"}`;
}
