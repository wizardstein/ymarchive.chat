"use client";

import { colorFor, initialsFor } from "@/lib/avatar";
import type { YMProfile } from "@/lib/types";

interface ProfilePickerProps {
  profiles: YMProfile[];
  onPick: (index: number) => void;
  onReset: () => void;
}

function totalMessages(p: YMProfile): number {
  return p.conversations.reduce((s, c) => s + c.messages.length, 0);
}

function messageDateRange(p: YMProfile): string {
  let first = Infinity;
  let last = -Infinity;
  for (const c of p.conversations) {
    if (c.messages.length) {
      const firstTs = c.messages[0].timestamp;
      const lastTs = c.messages[c.messages.length - 1].timestamp;
      if (firstTs < first) first = firstTs;
      if (lastTs > last) last = lastTs;
    }
  }
  if (!isFinite(first) || !isFinite(last)) return "";
  const fmt = (t: number) =>
    new Date(t * 1000).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  const a = fmt(first);
  const b = fmt(last);
  return a === b ? a : `${a} – ${b}`;
}

export function ProfilePicker({ profiles, onPick, onReset }: ProfilePickerProps) {
  return (
    <main className="min-h-screen bg-ym-cream">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <button
          onClick={onReset}
          className="text-sm text-slate-500 hover:text-ym-purple"
        >
          ← Open a different archive
        </button>

        <header className="mt-6">
          <h1 className="font-display text-4xl text-ym-purple-dark">
            {profiles.length === 1
              ? "Your archive is ready"
              : "Pick a profile to open"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {profiles.length === 1
              ? "One profile found in this archive."
              : `${profiles.length} profiles were found in this archive. You can switch between them later.`}
          </p>
        </header>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p, i) => {
            const msgs = totalMessages(p);
            const convos = p.conversations.length;
            const range = messageDateRange(p);
            return (
              <li key={p.username}>
                <button
                  onClick={() => onPick(i)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ym-purple hover:shadow-md"
                >
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatarUrl}
                      alt={p.username}
                      className="h-14 w-14 flex-none rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-base font-bold text-white"
                      style={{ background: colorFor(p.username) }}
                    >
                      {initialsFor(p.username)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-slate-900 group-hover:text-ym-purple-dark">
                      {p.username}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {msgs.toLocaleString()} messages · {convos.toLocaleString()}{" "}
                      {convos === 1 ? "contact" : "contacts"}
                    </div>
                    {range && (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {range}
                      </div>
                    )}
                  </div>
                  <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-ym-purple">
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
