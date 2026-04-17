"use client";

import { useMemo } from "react";
import { startOfDayLocalUnix } from "@/lib/format";
import type { YMMessage } from "@/lib/types";

export function DayNavigator({
  messages,
  currentTimestamp,
  onJump,
}: {
  messages: YMMessage[];
  currentTimestamp: number | null;
  onJump: (ts: number) => void;
}) {
  // Unique day starts in chronological order. Derived once per message set.
  const days = useMemo(() => {
    const seen = new Set<number>();
    const list: number[] = [];
    for (const m of messages) {
      const d = startOfDayLocalUnix(m.timestamp);
      if (!seen.has(d)) {
        seen.add(d);
        list.push(d);
      }
    }
    list.sort((a, b) => a - b);
    return list;
  }, [messages]);

  const { prevDay, nextDay } = useMemo(() => {
    if (days.length === 0) return { prevDay: null, nextDay: null };
    if (currentTimestamp == null) {
      return { prevDay: null, nextDay: days[0] };
    }
    const currentDay = startOfDayLocalUnix(currentTimestamp);
    // Binary search for the current day's index.
    let lo = 0;
    let hi = days.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (days[mid] < currentDay) lo = mid + 1;
      else hi = mid;
    }
    // lo is the first index with days[lo] >= currentDay.
    const exact = lo < days.length && days[lo] === currentDay;
    const prev = lo > 0 ? days[lo - 1] : null;
    const next = exact
      ? lo + 1 < days.length
        ? days[lo + 1]
        : null
      : lo < days.length
        ? days[lo]
        : null;
    return { prevDay: prev, nextDay: next };
  }, [days, currentTimestamp]);

  if (days.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
      <button
        type="button"
        disabled={prevDay == null}
        onClick={() => prevDay != null && onJump(prevDay)}
        title="Previous day with messages"
        aria-label="Jump to previous day"
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur transition hover:border-ym-purple hover:text-ym-purple disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12l5-5 5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        disabled={nextDay == null}
        onClick={() => nextDay != null && onJump(nextDay)}
        title="Next day with messages"
        aria-label="Jump to next day"
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur transition hover:border-ym-purple hover:text-ym-purple disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
