"use client";

import { useEffect } from "react";

interface ExportPdfModalProps {
  peer: string;
  filteredCount: number;
  fullCount: number;
  busy: boolean;
  onConfirm: (scope: "filtered" | "full") => void;
  onClose: () => void;
}

export function ExportPdfModal({
  peer,
  filteredCount,
  fullCount,
  busy,
  onConfirm,
  onClose,
}: ExportPdfModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-slate-900">
          Export conversation as PDF
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Conversation with <span className="font-medium">{peer}</span>. You
          have an active filter — choose what to include.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || filteredCount === 0}
            onClick={() => onConfirm("filtered")}
            className="flex items-center justify-between rounded-lg border border-ym-purple bg-ym-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ym-purple-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>Export filtered messages</span>
            <span className="text-xs font-normal opacity-80">
              {filteredCount.toLocaleString()}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm("full")}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-ym-purple hover:text-ym-purple disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>Export full conversation</span>
            <span className="text-xs font-normal text-slate-500">
              {fullCount.toLocaleString()}
            </span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {busy
              ? "Generating PDF…"
              : "Generated entirely in your browser."}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
