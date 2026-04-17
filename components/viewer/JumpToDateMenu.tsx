"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { YMMessage } from "@/lib/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MonthEntry {
  monthIndex: number; // 0-11
  startTimestamp: number;
  count: number;
}
interface YearEntry {
  year: number;
  startTimestamp: number;
  totalCount: number;
  months: MonthEntry[];
}

function buildYears(messages: YMMessage[]): YearEntry[] {
  if (messages.length === 0) return [];
  const byYear = new Map<
    number,
    Map<number, { startTimestamp: number; count: number }>
  >();
  for (const m of messages) {
    const d = new Date(m.timestamp * 1000);
    const y = d.getFullYear();
    const mi = d.getMonth();
    let months = byYear.get(y);
    if (!months) {
      months = new Map();
      byYear.set(y, months);
    }
    const existing = months.get(mi);
    if (existing) {
      existing.count++;
    } else {
      const monthStart = new Date(y, mi, 1, 0, 0, 0, 0).getTime() / 1000;
      months.set(mi, { startTimestamp: monthStart, count: 1 });
    }
  }
  const out: YearEntry[] = [];
  for (const [year, monthMap] of Array.from(byYear.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    const months = Array.from(monthMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([monthIndex, { startTimestamp, count }]) => ({
        monthIndex,
        startTimestamp,
        count,
      }));
    out.push({
      year,
      startTimestamp: new Date(year, 0, 1, 0, 0, 0, 0).getTime() / 1000,
      totalCount: months.reduce((s, m) => s + m.count, 0),
      months,
    });
  }
  return out;
}

export function JumpToDateMenu({
  messages,
  currentTimestamp,
  onJump,
}: {
  messages: YMMessage[];
  currentTimestamp: number | null;
  onJump: (ts: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const years = useMemo(() => buildYears(messages), [messages]);

  const currentYear =
    currentTimestamp != null
      ? new Date(currentTimestamp * 1000).getFullYear()
      : null;
  const currentMonth =
    currentTimestamp != null
      ? new Date(currentTimestamp * 1000).getMonth()
      : null;

  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set(currentYear != null ? [currentYear] : []),
  );

  // Whenever the visible year changes (and we're closed), make sure it's
  // expanded the next time the menu opens.
  useEffect(() => {
    if (open || currentYear == null) return;
    setExpandedYears((prev) => {
      if (prev.has(currentYear)) return prev;
      const next = new Set(prev);
      next.add(currentYear);
      return next;
    });
  }, [currentYear, open]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // When the menu opens, scroll the active month into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>("[data-active=true]");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [open]);

  const buttonLabel = useMemo(() => {
    if (currentTimestamp == null) return "Jump to date";
    return new Date(currentTimestamp * 1000).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }, [currentTimestamp]);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const jumpTo = (ts: number) => {
    onJump(ts);
    setOpen(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-ym-purple hover:text-ym-purple"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>📅</span>
        <span>{buttonLabel}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div
          ref={listRef}
          className="scrollbar-slim absolute left-0 top-full z-20 mt-2 max-h-96 w-[min(16rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {hasMessages && (
            <div className="flex gap-1 border-b border-slate-100 p-2">
              <button
                type="button"
                onClick={() => jumpTo(messages[0].timestamp)}
                className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                title="First message in the archive"
              >
                ⏫ Earliest
              </button>
              <button
                type="button"
                onClick={() =>
                  jumpTo(messages[messages.length - 1].timestamp)
                }
                className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                title="Most recent message"
              >
                Latest ⏬
              </button>
            </div>
          )}

          {years.length === 0 && (
            <p className="p-4 text-xs text-slate-400">No messages.</p>
          )}

          {years.map((y) => {
            const expanded = expandedYears.has(y.year);
            const yearIsActive = currentYear === y.year;
            return (
              <div
                key={y.year}
                className="border-b border-slate-100 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => toggleYear(y.year)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-50 ${
                    yearIsActive ? "text-ym-purple-dark" : "text-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 text-xs text-slate-400">
                      {expanded ? "▾" : "▸"}
                    </span>
                    {y.year}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {y.totalCount.toLocaleString()}
                  </span>
                </button>
                {expanded && (
                  <div className="pb-1">
                    {y.months.map((m) => {
                      const active =
                        yearIsActive && m.monthIndex === currentMonth;
                      return (
                        <button
                          key={m.startTimestamp}
                          type="button"
                          data-active={active || undefined}
                          onClick={() => jumpTo(m.startTimestamp)}
                          className={`flex w-full items-center justify-between py-1.5 pl-8 pr-3 text-left text-xs transition ${
                            active
                              ? "bg-ym-purple/10 font-semibold text-ym-purple-dark"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{MONTH_NAMES[m.monthIndex]}</span>
                          <span
                            className={
                              active ? "text-ym-purple" : "text-slate-400"
                            }
                          >
                            {m.count.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
