"use client";

import { useCallback, useRef, useState } from "react";
import type { FolderFile } from "@/lib/fsEntry";
import {
  collectDirectoryInputFiles,
  collectDroppedFiles,
  looksLikeZip,
} from "@/lib/fsEntry";
import type { ArchiveSession } from "@/lib/session";

export type UploadPayload =
  | { kind: "zip"; file: File }
  | { kind: "folder"; files: FolderFile[] };

interface UploadZoneProps {
  onUpload: (payload: UploadPayload) => void;
  pastSessions?: ArchiveSession[];
  onOpenPast?: (session: ArchiveSession) => void;
  onRemovePast?: (fingerprint: string) => void;
  onClearAll?: () => void | Promise<void>;
}

// Custom attributes that aren't in React's default typings.
type DirInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string;
  directory?: string;
};

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return new Date(ts).toLocaleDateString();
}

export function UploadZone({
  onUpload,
  pastSessions = [],
  onOpenPast,
  onRemovePast,
  onClearAll,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const items = e.dataTransfer.items;
      const files = e.dataTransfer.files;

      if (files.length === 1 && looksLikeZip(files[0])) {
        const maybeEntry = (items?.[0] as unknown as {
          webkitGetAsEntry?: () => { isFile: boolean } | null;
        })?.webkitGetAsEntry?.();
        if (!maybeEntry || maybeEntry.isFile) {
          onUpload({ kind: "zip", file: files[0] });
          return;
        }
      }

      const collected = await collectDroppedFiles(e.dataTransfer);
      if (collected.length === 0) return;

      if (collected.length === 1 && looksLikeZip(collected[0].file)) {
        onUpload({ kind: "zip", file: collected[0].file });
        return;
      }
      onUpload({ kind: "folder", files: collected });
    },
    [onUpload],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload({ kind: "zip", file });
      e.target.value = "";
    },
    [onUpload],
  );

  const onFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const files = collectDirectoryInputFiles(e.target.files);
      if (files.length) onUpload({ kind: "folder", files });
      e.target.value = "";
    },
    [onUpload],
  );

  const confirmClear = async () => {
    if (onClearAll) await onClearAll();
    setConfirmingClear(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`w-full rounded-3xl border-2 border-dashed p-14 text-center transition ${
          dragging
            ? "border-ym-purple bg-ym-purple/10"
            : "border-slate-300 bg-white hover:border-ym-purple hover:bg-ym-purple/5"
        }`}
      >
        <div className="text-6xl">📂</div>
        <h2 className="mt-4 font-display text-3xl text-ym-purple-dark">
          Drop your archive here
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          A{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
            .zip
          </code>{" "}
          file, or the folder itself — either works. Multiple profile folders
          (
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
            profiles1
          </code>
          ,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
            profiles2
          </code>
          …) can sit side by side inside one folder and we'll merge them.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-ym-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ym-purple-dark"
          >
            Pick a .zip file
          </button>
          <span className="text-xs text-slate-400">or</span>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="rounded-full border border-ym-purple px-5 py-2.5 text-sm font-semibold text-ym-purple transition hover:bg-ym-purple/10"
          >
            Pick a folder
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={onFileInputChange}
        />
        <input
          ref={folderInputRef}
          {...({
            webkitdirectory: "",
            directory: "",
          } as DirInputProps)}
          type="file"
          multiple
          className="hidden"
          onChange={onFolderInputChange}
        />
      </div>

      {pastSessions.length > 0 && (
        <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent archives on this device ({pastSessions.length})
            </h3>
            {onClearAll && (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="text-[11px] text-slate-400 hover:text-red-600"
              >
                Clear all
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Saved in your browser only — never uploaded. Clearing removes both
            the pointer and the decoded data from this device.
          </p>

          <ul className="mt-4 space-y-2">
            {pastSessions.map((s) => (
              <li
                key={s.fingerprint}
                className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-ym-cream/60 p-3 transition hover:border-ym-purple"
              >
                <button
                  type="button"
                  onClick={() => onOpenPast?.(s)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ym-purple/10 text-lg">
                    🗂️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-ym-purple-dark">
                      {s.label || "Archive"}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {s.profileCount.toLocaleString()}{" "}
                      {s.profileCount === 1 ? "profile" : "profiles"}
                      {s.totalMessages > 0
                        ? ` · ${s.totalMessages.toLocaleString()} msgs`
                        : ""}{" "}
                      · {formatRelativeTime(s.savedAt)}
                    </div>
                  </div>
                </button>
                {onRemovePast && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePast(s.fingerprint);
                    }}
                    title="Remove this archive from your device"
                    aria-label="Remove this archive"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>

          {confirmingClear && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              <p className="font-semibold">
                Remove all {pastSessions.length} archive
                {pastSessions.length === 1 ? "" : "s"} from this device?
              </p>
              <p className="mt-1 text-red-900/80">
                Wipes the IndexedDB cache and the recent-archives list. The
                source files on your computer are untouched. You can re-open
                them anytime.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={confirmClear}
                  className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                >
                  Yes, clear everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="rounded-full border border-red-200 px-3 py-1 text-[11px] text-red-700 hover:bg-red-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 max-w-md space-y-3 text-center text-xs leading-relaxed text-slate-500">
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-slate-700">
          <strong className="font-semibold">A note on shared archives.</strong>{" "}
          Yahoo&apos;s .dat format was never strongly encrypted — the files are
          just XOR-scrambled with the account username. If this archive folder
          contains profiles that belonged to other people on a shared
          computer, their conversations decode just like yours. Please be
          thoughtful about whose messages you&apos;re reading. This tool
          performs no ownership check; responsibility stays with you.{" "}
          <a
            href="/#faq"
            className="font-medium text-ym-purple hover:underline"
          >
            More in the FAQ →
          </a>
        </p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-amber-900">
          <strong className="font-semibold">
            Heads up about &ldquo;Pick a folder&rdquo;:
          </strong>{" "}
          your browser will ask{" "}
          <em>&ldquo;Upload N files to this site?&rdquo;</em> — that&apos;s
          the browser&apos;s fixed wording for folder access. Nothing is
          actually uploaded; every file stays in your browser. You can verify
          this in the Network tab. (Drag-and-drop skips this dialog.)
        </p>
        <p>
          💡 The folder can be named anything —{" "}
          <code className="font-mono">Profiles</code>,{" "}
          <code className="font-mono">profiles1</code>, or some random backup
          folder you saved years ago. What matters is that an{" "}
          <code className="font-mono">Archive/Messages/</code> folder lives
          somewhere inside.
        </p>
      </div>
    </div>
  );
}
