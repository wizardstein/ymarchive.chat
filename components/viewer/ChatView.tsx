"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { colorFor, initialsFor } from "@/lib/avatar";
import {
  dateToUnixEndOfDay,
  dateToUnixStartOfDay,
  formatDateDivider,
  formatDateRange,
  startOfDayLocalUnix,
} from "@/lib/format";
import type { YMConversation, YMMessage, YMProfile } from "@/lib/types";
import { DayNavigator } from "./DayNavigator";
import { ExportPdfModal } from "./ExportPdfModal";
import { JumpToDateMenu } from "./JumpToDateMenu";
import { MessageBubble } from "./MessageBubble";

const WINDOW_SIZE = 400;

interface ChatViewProps {
  profile: YMProfile;
  conversation: YMConversation;
  onBack?: () => void;
}

/**
 * Binary-search the first message index whose timestamp is >= target.
 * Returns messages.length if all are earlier.
 */
function firstAtOrAfter(messages: YMMessage[], targetTs: number): number {
  let lo = 0;
  let hi = messages.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (messages[mid].timestamp < targetTs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function ChatView({ profile, conversation, onBack }: ChatViewProps) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAvatarHistory, setShowAvatarHistory] = useState(false);
  const [windowStart, setWindowStart] = useState<number>(() =>
    Math.max(0, conversation.messages.length - WINDOW_SIZE),
  );
  const [stickyDateTs, setStickyDateTs] = useState<number | null>(null);
  const [pendingScrollTs, setPendingScrollTs] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Reset window + filters + sticky date whenever the conversation changes.
  useEffect(() => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setWindowStart(Math.max(0, conversation.messages.length - WINDOW_SIZE));
    setStickyDateTs(null);
    setPendingScrollTs(null);
    setExportOpen(false);
    setExporting(false);
    setExportError(null);
  }, [conversation]);

  const fromUnix = useMemo(() => dateToUnixStartOfDay(fromDate), [fromDate]);
  const toUnix = useMemo(() => dateToUnixEndOfDay(toDate), [toDate]);
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q && fromUnix == null && toUnix == null) return conversation.messages;
    return conversation.messages.filter((m) => {
      if (fromUnix != null && m.timestamp < fromUnix) return false;
      if (toUnix != null && m.timestamp > toUnix) return false;
      if (q && !m.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversation.messages, q, fromUnix, toUnix]);

  const filterActive = Boolean(q) || fromUnix != null || toUnix != null;
  const visible = filterActive
    ? filtered
    : filtered.slice(windowStart, windowStart + WINDOW_SIZE);

  const firstTs = filtered[0]?.timestamp;
  const lastTs = filtered[filtered.length - 1]?.timestamp;

  const canLoadEarlier = !filterActive && windowStart > 0;

  // Auto-load earlier when the user scrolls to the top sentinel.
  useEffect(() => {
    if (!canLoadEarlier) return;
    const el = topSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setWindowStart((s) => Math.max(0, s - WINDOW_SIZE));
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [canLoadEarlier]);

  // Track the sticky "currently viewing" date based on which date divider is
  // just above the top of the scroll area.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const dividers = el.querySelectorAll<HTMLElement>("[data-day]");
      if (dividers.length === 0) {
        setStickyDateTs(null);
        return;
      }
      const containerTop = el.getBoundingClientRect().top;
      let chosen: HTMLElement | null = null;
      for (const node of Array.from(dividers)) {
        const rect = node.getBoundingClientRect();
        if (rect.top - containerTop <= 4) chosen = node;
        else break;
      }
      if (chosen) {
        const ts = Number(chosen.dataset.day);
        if (!isNaN(ts)) setStickyDateTs(ts);
      } else {
        const first = dividers[0];
        const ts = Number(first.dataset.day);
        if (!isNaN(ts)) setStickyDateTs(ts);
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Initial read.
    update();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible.length]);

  // After a jump, re-anchor the window and scroll the targeted message into view.
  const jumpToTimestamp = useCallback(
    (targetTs: number) => {
      if (filterActive) return;
      if (conversation.messages.length === 0) return;
      const idx = firstAtOrAfter(conversation.messages, targetTs);
      const clamped = Math.min(idx, conversation.messages.length - 1);
      const targetMsgTs =
        conversation.messages[clamped]?.timestamp ?? targetTs;

      // Update sticky date synchronously so subsequent navigator clicks
      // compute prev/next against the new position right away — without
      // waiting for the async scroll event to fire.
      setStickyDateTs(startOfDayLocalUnix(targetMsgTs));

      // Anchor the target near the top of the visible window.
      const maxStart = Math.max(0, conversation.messages.length - WINDOW_SIZE);
      const newStart = Math.max(
        0,
        Math.min(maxStart, clamped - Math.floor(WINDOW_SIZE / 6)),
      );
      setWindowStart(newStart);
      setPendingScrollTs(targetMsgTs);
    },
    [conversation.messages, filterActive],
  );

  const runExport = useCallback(
    async (scope: "filtered" | "full") => {
      if (exporting) return;
      setExporting(true);
      setExportError(null);
      try {
        const { exportConversationToPdf } = await import("@/lib/pdfExport");
        const messages =
          scope === "filtered" ? filtered : conversation.messages;
        await exportConversationToPdf(profile, conversation, messages, {
          scope,
        });
        setExportOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Export failed";
        setExportError(msg);
      } finally {
        setExporting(false);
      }
    },
    [conversation, exporting, filtered, profile],
  );

  const handleExportClick = useCallback(() => {
    setExportError(null);
    if (filterActive) {
      setExportOpen(true);
    } else {
      void runExport("full");
    }
  }, [filterActive, runExport]);

  // Once the window has re-rendered, locate the target message and scroll
  // it into view. useLayoutEffect avoids a visible flash.
  useLayoutEffect(() => {
    if (pendingScrollTs == null) return;
    const el = scrollRef.current;
    if (!el) return;
    const node = el.querySelector<HTMLElement>(
      `[data-ts="${pendingScrollTs}"]`,
    );
    if (node) {
      node.scrollIntoView({ block: "start", behavior: "auto" });
      setPendingScrollTs(null);
    }
  }, [pendingScrollTs, windowStart]);

  return (
    <section className="flex h-full flex-1 flex-col bg-ym-cream">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:gap-3 sm:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-ym-purple hover:text-ym-purple md:hidden"
            aria-label="Back to contacts"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 5l-5 5 5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: colorFor(conversation.peer) }}
        >
          {initialsFor(conversation.peer)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">
            {conversation.peer}
          </div>
          <div className="truncate text-xs text-slate-500">
            {filtered.length.toLocaleString()} of{" "}
            {conversation.messages.length.toLocaleString()} messages
            {firstTs && lastTs
              ? ` · ${formatDateRange(firstTs, lastTs)}`
              : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportClick}
          disabled={exporting || conversation.messages.length === 0}
          className="flex-none rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-ym-purple hover:text-ym-purple disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
          title="Download this conversation as a PDF"
        >
          <span className="hidden sm:inline">
            {exporting ? "Generating PDF…" : "📄 Export PDF"}
          </span>
          <span className="sm:hidden">{exporting ? "…" : "📄"}</span>
        </button>
        {profile.avatarHistory.length > 0 && (
          <button
            onClick={() => setShowAvatarHistory((s) => !s)}
            className="flex-none rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-ym-purple hover:text-ym-purple sm:px-3"
            title="Show your avatar history"
          >
            <span className="hidden sm:inline">
              {showAvatarHistory ? "Hide" : "Show"} your avatar history (
              {profile.avatarHistory.length})
            </span>
            <span className="sm:hidden">
              🖼️ {profile.avatarHistory.length}
            </span>
          </button>
        )}
      </header>

      {exportError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700">
          PDF export failed: {exportError}
        </div>
      )}

      {exportOpen && (
        <ExportPdfModal
          peer={conversation.peer}
          filteredCount={filtered.length}
          fullCount={conversation.messages.length}
          busy={exporting}
          onConfirm={runExport}
          onClose={() => {
            if (!exporting) setExportOpen(false);
          }}
        />
      )}

      {showAvatarHistory && profile.avatarHistory.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-5 py-3">
          {profile.avatarHistory.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Avatar ${i + 1}`}
              className="h-14 w-14 flex-none rounded-lg border border-slate-200 object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-5">
        <JumpToDateMenu
          messages={conversation.messages}
          currentTimestamp={stickyDateTs}
          onJump={jumpToTimestamp}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-ym-purple focus:outline-none focus:ring-1 focus:ring-ym-purple"
        />
        <label className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
        <label className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
          To
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
        {(search || fromDate || toDate) && (
          <button
            onClick={() => {
              setSearch("");
              setFromDate("");
              setToDate("");
            }}
            className="text-xs text-ym-purple hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="scrollbar-slim relative flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        >
          {/* Sticky "currently viewing" date. Pointer-events disabled so it
              doesn't catch clicks intended for the message below. */}
          {stickyDateTs != null && visible.length > 0 && (
            <div className="pointer-events-none sticky top-0 z-10 -mt-4 mb-2 flex justify-center pt-2">
              <span className="pointer-events-auto rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow backdrop-blur">
                {formatDateDivider(stickyDateTs)}
              </span>
            </div>
          )}

          {canLoadEarlier && (
            <div
              ref={topSentinelRef}
              className="mb-4 flex justify-center text-xs text-slate-400"
            >
              <button
                onClick={() =>
                  setWindowStart((s) => Math.max(0, s - WINDOW_SIZE))
                }
                className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-ym-purple hover:text-ym-purple"
              >
                Load earlier messages
              </button>
            </div>
          )}

          {visible.length === 0 ? (
            <p className="mt-12 text-center text-sm text-slate-400">
              No messages match these filters.
            </p>
          ) : (
            <MessageList
              messages={visible}
              profile={profile}
              peer={conversation.peer}
              query={q}
            />
          )}
        </div>

        {!filterActive && visible.length > 0 && (
          <DayNavigator
            messages={conversation.messages}
            currentTimestamp={stickyDateTs}
            onJump={jumpToTimestamp}
          />
        )}
      </div>
    </section>
  );
}

function MessageList({
  messages,
  profile,
  peer,
  query,
}: {
  messages: YMMessage[];
  profile: YMProfile;
  peer: string;
  query: string;
}) {
  const rows: React.ReactNode[] = [];
  let lastDay: number | null = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const day = startOfDayLocalUnix(m.timestamp);
    if (day !== lastDay) {
      rows.push(
        <div
          key={`d-${m.timestamp}-${i}`}
          data-day={day}
          className="my-4 flex justify-center"
        >
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
            {formatDateDivider(m.timestamp)}
          </span>
        </div>,
      );
      lastDay = day;
    }
    rows.push(
      <div
        key={`m-${i}-${m.timestamp}`}
        data-ts={m.timestamp}
        className="mb-2"
        style={
          {
            contentVisibility: "auto",
            containIntrinsicSize: "0 60px",
          } as React.CSSProperties
        }
      >
        <MessageBubble message={m} highlight={query || undefined} />
      </div>,
    );
  }

  return <div>{rows}</div>;
}
