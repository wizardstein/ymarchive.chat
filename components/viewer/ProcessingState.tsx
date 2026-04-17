"use client";

import type { ProcessingProgress } from "@/lib/types";

const STAGE_ORDER: Array<{
  key: ProcessingProgress["stage"];
  label: string;
}> = [
  { key: "unzipping", label: "Unzipping archive" },
  { key: "detecting", label: "Detecting profiles" },
  { key: "decoding", label: "Decoding messages" },
  { key: "loading-avatars", label: "Loading avatars" },
  { key: "ready", label: "Ready" },
];

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds < 1) return "a moment";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = Math.round(seconds - minutes * 60);
  if (minutes < 10) return `${minutes}m ${remSec}s`;
  return `${minutes}m`;
}

export function ProcessingState({
  progress,
  error,
  onReset,
}: {
  progress: ProcessingProgress;
  error: string | null;
  onReset: () => void;
}) {
  const currentIdx = STAGE_ORDER.findIndex((s) => s.key === progress.stage);
  const pct =
    progress.filesTotal && progress.filesTotal > 0
      ? Math.round(((progress.filesDone ?? 0) / progress.filesTotal) * 100)
      : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="font-display text-2xl text-ym-purple-dark">
          {error ? "Something went wrong" : "Working on it…"}
        </h2>
        {error ? (
          <>
            <p className="mt-3 text-sm text-red-600">{error}</p>
            <button
              onClick={onReset}
              className="mt-6 rounded-full bg-ym-purple px-5 py-2 text-sm font-semibold text-white hover:bg-ym-purple-dark"
            >
              Try another file
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              {progress.message ?? "Processing…"}
            </p>
            <ul className="mt-6 space-y-2">
              {STAGE_ORDER.map((s, i) => {
                const state =
                  i < currentIdx
                    ? "done"
                    : i === currentIdx
                      ? "active"
                      : "pending";
                return (
                  <li
                    key={s.key}
                    className={`flex items-center gap-3 text-sm ${
                      state === "done"
                        ? "text-slate-500"
                        : state === "active"
                          ? "text-ym-purple-dark"
                          : "text-slate-300"
                    }`}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border">
                      {state === "done" ? "✓" : state === "active" ? "•" : ""}
                    </span>
                    {s.label}
                    {state === "active" &&
                      progress.filesTotal != null &&
                      progress.filesTotal > 0 &&
                      (progress.stage === "decoding" ||
                        progress.stage === "loading-avatars") && (
                        <span className="ml-auto text-xs text-slate-400">
                          {progress.filesDone}/{progress.filesTotal}
                        </span>
                      )}
                  </li>
                );
              })}
            </ul>

            {progress.stage === "decoding" && progress.filesTotal ? (
              <div className="mt-6 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-ym-purple transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{pct}%</span>
                  <span>
                    {progress.ratePerSec && progress.ratePerSec > 0
                      ? `${Math.round(progress.ratePerSec)} files/sec`
                      : ""}
                    {progress.etaSeconds && progress.etaSeconds > 0
                      ? ` · ETA ${formatEta(progress.etaSeconds)}`
                      : ""}
                  </span>
                </div>
              </div>
            ) : null}

            {progress.fromCache && (
              <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                ⚡ Loaded instantly from cache — this archive was decoded
                before. Next time a new archive lands, the first decode takes a
                bit; every reopen after that is instant.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
