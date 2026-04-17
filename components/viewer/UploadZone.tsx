"use client";

import { useCallback, useRef, useState } from "react";
import type { FolderFile } from "@/lib/fsEntry";
import {
  collectDirectoryInputFiles,
  collectDroppedFiles,
  looksLikeZip,
} from "@/lib/fsEntry";

export type UploadPayload =
  | { kind: "zip"; file: File }
  | { kind: "folder"; files: FolderFile[] };

interface UploadZoneProps {
  onUpload: (payload: UploadPayload) => void;
}

// Custom attributes that aren't in React's default typings.
type DirInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string;
  directory?: string;
};

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const items = e.dataTransfer.items;
      const files = e.dataTransfer.files;

      // Single zip file dropped? Take the fast path.
      if (files.length === 1 && looksLikeZip(files[0])) {
        // If the one item is actually a folder, items[0].webkitGetAsEntry()
        // will report isDirectory — but a real zip drops as isFile.
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

      // If the user dropped exactly one zip (picked up via folder path), route it.
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
          A <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.zip</code>{" "}
          file, or the folder itself — either works. Multiple profile folders
          (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">profiles1</code>,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">profiles2</code>…)
          can sit side by side inside one folder and we'll merge them.
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

      <div className="mt-6 max-w-md space-y-3 text-center text-xs leading-relaxed text-slate-500">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-amber-900">
          <strong className="font-semibold">Heads up about &ldquo;Pick a folder&rdquo;:</strong>{" "}
          your browser will ask{" "}
          <em>&ldquo;Upload N files to this site?&rdquo;</em>{" "}
          — that&apos;s the browser&apos;s fixed wording for folder access.
          Nothing is actually uploaded; every file stays in your browser. You
          can verify this in the Network tab. (Drag-and-drop skips this
          dialog.)
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
