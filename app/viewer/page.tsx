"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatView } from "@/components/viewer/ChatView";
import { DonateBadge } from "@/components/viewer/DonateBadge";
import { ProcessingState } from "@/components/viewer/ProcessingState";
import { ProfilePicker } from "@/components/viewer/ProfilePicker";
import { Sidebar } from "@/components/viewer/Sidebar";
import { UploadZone, type UploadPayload } from "@/components/viewer/UploadZone";
import { cacheGet } from "@/lib/cache";
import {
  clearSession,
  readSession,
  saveSession,
  sessionLabel,
} from "@/lib/session";
import type { ProcessingProgress, YMProfile } from "@/lib/types";
import { parseArchive, parseFolderEntries } from "@/lib/zipParser";

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
  const restoreAttemptedRef = useRef(false);

  // Auto-restore on mount: if we have a saved session AND the decoded
  // archive is still in IndexedDB, jump straight back into the viewer.
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;
    const session = readSession();
    if (!session) {
      setRestoring(false);
      return;
    }
    (async () => {
      const cached = await cacheGet(session.fingerprint);
      if (!cached || cached.length === 0) {
        clearSession();
        setRestoring(false);
        return;
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
      }
      setProgress({ stage: "ready" });
      setRestoring(false);
    })();
  }, []);

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
        saveSession({
          fingerprint: result.fingerprint,
          label: sessionLabel(result.profiles),
          profileCount: result.profiles.length,
          pickedIdx: result.profiles.length === 1 ? 0 : null,
          activePeer:
            result.profiles.length === 1
              ? (result.profiles[0].conversations[0]?.peer ?? null)
              : null,
          savedAt: Date.now(),
        });
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

  // Persist navigation state as the user moves around.
  useEffect(() => {
    if (!profiles || !fingerprint) return;
    saveSession({
      fingerprint,
      label: sessionLabel(profiles),
      profileCount: profiles.length,
      pickedIdx,
      activePeer,
      savedAt: Date.now(),
    });
  }, [profiles, fingerprint, pickedIdx, activePeer]);

  const handleReset = useCallback(() => {
    clearSession();
    setProfiles(null);
    setFingerprint(null);
    setProgress({ stage: "idle" });
    setError(null);
    setPickedIdx(null);
    setActivePeer(null);
  }, []);

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
    return <UploadZone onUpload={handleUpload} />;
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
