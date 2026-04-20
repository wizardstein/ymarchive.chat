"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatView } from "@/components/viewer/ChatView";
import { DonateBadge } from "@/components/viewer/DonateBadge";
import { ProcessingState } from "@/components/viewer/ProcessingState";
import { ProfilePicker } from "@/components/viewer/ProfilePicker";
import { Sidebar } from "@/components/viewer/Sidebar";
import { UploadZone, type UploadPayload } from "@/components/viewer/UploadZone";
import { cacheClearAll, cacheGet, cachePut } from "@/lib/cache";
import { mergeProfiles } from "@/lib/mergeProfiles";
import {
  clearAllSessions,
  type ArchiveSession,
  listSessions,
  readLastSession,
  removeSession,
  sessionLabel,
  upsertSession,
} from "@/lib/session";
import type { ProcessingProgress, YMProfile } from "@/lib/types";
import { parseArchive, parseFolderEntries, sha256Hex } from "@/lib/zipParser";

export default function ViewerPage() {
  const [profiles, setProfiles] = useState<YMProfile[] | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: "idle",
  });
  const [error, setError] = useState<string | null>(null);
  // null = profile picker is shown; number = user has chosen a profile.
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [pastSessions, setPastSessions] = useState<ArchiveSession[]>([]);
  const restoreAttemptedRef = useRef(false);

  const refreshPastSessions = useCallback(() => {
    setPastSessions(listSessions());
  }, []);

  // Load a session (either the most-recent on mount, or one the user picks
  // from the "recent archives" list). If the IndexedDB cache no longer has
  // its parsed data, drop it from the session list so we don't keep
  // offering a broken entry.
  const loadSession = useCallback(
    async (session: ArchiveSession): Promise<boolean> => {
      const cached = await cacheGet(session.fingerprint);
      if (!cached || cached.length === 0) {
        removeSession(session.fingerprint);
        refreshPastSessions();
        return false;
      }
      setProfiles(cached);
      setFingerprint(session.fingerprint);
      const safeIdx =
        session.pickedIdx != null && session.pickedIdx < cached.length
          ? session.pickedIdx
          : cached.length === 1
            ? 0
            : null;
      setPickedIdx(safeIdx);
      if (safeIdx != null) {
        const profile = cached[safeIdx];
        const peer =
          session.activePeer &&
          profile.conversations.some((c) => c.peer === session.activePeer)
            ? session.activePeer
            : (profile.conversations[0]?.peer ?? null);
        setActivePeer(peer);
      } else {
        setActivePeer(null);
      }
      setProgress({ stage: "ready" });
      setError(null);
      return true;
    },
    [refreshPastSessions],
  );

  // Auto-restore on mount: if we have any saved sessions AND the most
  // recent one is still in IndexedDB, jump straight back into the viewer.
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;
    refreshPastSessions();
    const last = readLastSession();
    if (!last) {
      setRestoring(false);
      return;
    }
    (async () => {
      await loadSession(last);
      setRestoring(false);
    })();
  }, [loadSession, refreshPastSessions]);

  const handleUpload = useCallback(async (payload: UploadPayload) => {
    setError(null);
    setProfiles(null);
    setPickedIdx(null);
    setActivePeer(null);
    setFingerprint(null);
    setProgress({ stage: "unzipping", message: "Starting…" });
    try {
      const result =
        payload.kind === "zip"
          ? await parseArchive(payload.file, (p) => setProgress(p))
          : await parseFolderEntries(payload.files, (p) => setProgress(p));

      if (result.profiles.length === 0) {
        setError(
          "No Yahoo! Messenger profiles found. The viewer looks for any folder containing <username>/Archive/Messages/<peer>/*.dat — make sure that structure is somewhere in your archive.",
        );
        setProgress({ stage: "error" });
        return;
      }
      setProfiles(result.profiles);
      setFingerprint(result.fingerprint);
      if (result.profiles.length === 1) {
        setPickedIdx(0);
        setActivePeer(result.profiles[0].conversations[0]?.peer ?? null);
      }
      setProgress({ stage: "ready" });

      if (result.fingerprint) {
        const totalMessages = result.profiles.reduce(
          (s, p) => s + p.conversations.reduce((ss, c) => ss + c.messages.length, 0),
          0,
        );
        const now = Date.now();
        upsertSession({
          fingerprint: result.fingerprint,
          label: sessionLabel(result.profiles),
          profileCount: result.profiles.length,
          totalMessages,
          pickedIdx: result.profiles.length === 1 ? 0 : null,
          activePeer:
            result.profiles.length === 1
              ? (result.profiles[0].conversations[0]?.peer ?? null)
              : null,
          savedAt: now,
          createdAt: now,
        });
        refreshPastSessions();
      }
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong reading that archive.",
      );
      setProgress({ stage: "error" });
    }
  }, []);

  // Recover from a stale activePeer when the selected profile changes —
  // e.g. user had peer X selected in profile A, then switched to profile B
  // which has no peer X. In that case, fall back to the new profile's first
  // peer. Crucially, we do NOT fire when activePeer is null: on mobile the
  // back button intentionally sets it to null to reveal the sidebar, and
  // auto-restoring it here would immediately hide the sidebar again.
  useEffect(() => {
    if (!profiles || pickedIdx == null) return;
    if (activePeer == null) return;
    const p = profiles[pickedIdx];
    if (!p) return;
    if (p.conversations.some((c) => c.peer === activePeer)) return;
    setActivePeer(p.conversations[0]?.peer ?? null);
  }, [profiles, pickedIdx, activePeer]);

  // Persist navigation state as the user moves around. We upsert into the
  // list so the same archive's entry keeps getting its savedAt bumped.
  useEffect(() => {
    if (!profiles || !fingerprint) return;
    const totalMessages = profiles.reduce(
      (s, p) => s + p.conversations.reduce((ss, c) => ss + c.messages.length, 0),
      0,
    );
    const now = Date.now();
    upsertSession({
      fingerprint,
      label: sessionLabel(profiles),
      profileCount: profiles.length,
      totalMessages,
      pickedIdx,
      activePeer,
      savedAt: now,
      createdAt: now,
    });
    refreshPastSessions();
  }, [profiles, fingerprint, pickedIdx, activePeer, refreshPastSessions]);

  // "Open a different archive" just clears in-memory state — the archive
  // stays in the cache and in the recent-archives list so the user can
  // come back to it later.
  const handleReset = useCallback(() => {
    setProfiles(null);
    setFingerprint(null);
    setProgress({ stage: "idle" });
    setError(null);
    setPickedIdx(null);
    setActivePeer(null);
  }, []);

  const handleOpenPast = useCallback(
    async (session: ArchiveSession) => {
      setError(null);
      setProgress({
        stage: "unzipping",
        message: "Loading from cache…",
      });
      const ok = await loadSession(session);
      if (!ok) {
        setError(
          "That archive isn't in your browser's cache anymore — it was cleared or evicted. Drop the folder again to re-open it.",
        );
        setProgress({ stage: "error" });
      }
    },
    [loadSession],
  );

  const handleRemovePast = useCallback(
    (fingerprint: string) => {
      removeSession(fingerprint);
      // Best-effort IDB delete too, so storage is actually freed.
      import("@/lib/cache").then(({ cacheDelete }) =>
        cacheDelete(fingerprint).catch(() => {}),
      );
      refreshPastSessions();
    },
    [refreshPastSessions],
  );

  const handleMerge = useCallback(
    async (fingerprints: string[]) => {
      if (fingerprints.length < 2) {
        throw new Error("Pick at least two archives to merge.");
      }

      // Pull each source from the IndexedDB cache. If any has been evicted
      // since the past-sessions list was built, refuse the whole operation
      // so the user knows what's going on rather than getting a partial merge.
      const sources: YMProfile[][] = [];
      const labels: string[] = [];
      for (const fp of fingerprints) {
        const cached = await cacheGet(fp);
        if (!cached || cached.length === 0) {
          const stale = pastSessions.find((s) => s.fingerprint === fp);
          throw new Error(
            stale
              ? `"${stale.label}" is no longer in your browser cache. Remove it from the list and try again.`
              : "One of the selected archives is no longer in your browser cache. Refresh the page and try again.",
          );
        }
        sources.push(cached);
        const meta = pastSessions.find((s) => s.fingerprint === fp);
        if (meta) labels.push(meta.label);
      }

      const merged = mergeProfiles(sources);
      if (merged.length === 0) {
        throw new Error(
          "The selected archives produced no messages after merging.",
        );
      }

      const sortedFps = [...fingerprints].sort();
      const synthFp = `merged:${await sha256Hex(sortedFps.join("|"))}`;

      await cachePut(synthFp, merged);
      // cachePut silently swallows quota errors; verify the write actually
      // landed before we update the session list.
      const readback = await cacheGet(synthFp);
      if (!readback || readback.length === 0) {
        throw new Error(
          "Your browser ran out of storage saving the merged archive. Remove some old sessions from the list and try again.",
        );
      }

      const totalMessages = merged.reduce(
        (s, p) => s + p.conversations.reduce((ss, c) => ss + c.messages.length, 0),
        0,
      );
      const baseLabel = sessionLabel(merged);
      const mergedLabel = `Merged · ${baseLabel} (${fingerprints.length} archives)`;
      const now = Date.now();
      const newSession: ArchiveSession = {
        fingerprint: synthFp,
        label: mergedLabel,
        profileCount: merged.length,
        totalMessages,
        pickedIdx: merged.length === 1 ? 0 : null,
        activePeer:
          merged.length === 1
            ? (merged[0].conversations[0]?.peer ?? null)
            : null,
        savedAt: now,
        createdAt: now,
      };
      upsertSession(newSession);
      refreshPastSessions();

      // Drop the user straight into the merged session.
      await loadSession(newSession);
    },
    [pastSessions, refreshPastSessions, loadSession],
  );

  const handleClearAll = useCallback(async () => {
    clearAllSessions();
    await cacheClearAll();
    setProfiles(null);
    setFingerprint(null);
    setPickedIdx(null);
    setActivePeer(null);
    setProgress({ stage: "idle" });
    setError(null);
    refreshPastSessions();
  }, [refreshPastSessions]);

  const handlePickProfile = useCallback(
    (idx: number) => {
      setPickedIdx(idx);
      if (profiles) {
        setActivePeer(profiles[idx].conversations[0]?.peer ?? null);
      }
    },
    [profiles],
  );

  const handleSwitchProfile = useCallback(() => {
    setPickedIdx(null);
    setActivePeer(null);
  }, []);

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Restoring your last session…
      </div>
    );
  }

  if (progress.stage === "idle" && !profiles) {
    return (
      <UploadZone
        onUpload={handleUpload}
        pastSessions={pastSessions}
        onOpenPast={handleOpenPast}
        onRemovePast={handleRemovePast}
        onClearAll={handleClearAll}
        onMerge={handleMerge}
      />
    );
  }

  if (!profiles) {
    return (
      <ProcessingState
        progress={progress}
        error={error}
        onReset={handleReset}
      />
    );
  }

  if (pickedIdx == null) {
    return (
      <ProfilePicker
        profiles={profiles}
        onPick={handlePickProfile}
        onReset={handleReset}
      />
    );
  }

  const profile = profiles[pickedIdx];
  const conversation =
    profile.conversations.find((c) => c.peer === activePeer) ??
    profile.conversations[0];

  // On mobile, show sidebar OR chat — not both — so nothing gets clipped at
  // narrow widths. The chat is "active" once a peer is selected.
  const mobileShowChat = activePeer != null;

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-ym-cream">
      <div
        className={`${mobileShowChat ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}
      >
        <Sidebar
          profile={profile}
          profileCount={profiles.length}
          activePeer={conversation?.peer ?? null}
          onSelectPeer={setActivePeer}
          onSwitchProfile={handleSwitchProfile}
          onReset={handleReset}
        />
      </div>
      <div
        className={`${mobileShowChat ? "flex" : "hidden md:flex"} h-full min-w-0 flex-1 flex-col`}
      >
        {conversation ? (
          <ChatView
            profile={profile}
            conversation={conversation}
            onBack={() => setActivePeer(null)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            This profile has no conversations.
          </div>
        )}
      </div>
      <DonateBadge />
    </main>
  );
}
