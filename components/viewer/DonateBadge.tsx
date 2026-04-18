"use client";

import { useEffect, useState } from "react";
import { DonationModal } from "@/components/DonationButton";

const DISMISS_KEY = "ym-donate-dismissed-at";
// Once dismissed, stay dismissed for a while. Then quietly reappear.
const REAPPEAR_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function DonateBadge() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const dismissedAt = Number(raw);
      if (
        Number.isFinite(dismissedAt) &&
        Date.now() - dismissedAt > REAPPEAR_AFTER_MS
      ) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-40"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50/95 py-2 pl-3 pr-2 text-sm font-medium text-amber-900 shadow-lg backdrop-blur transition-all duration-200 hover:bg-amber-100">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            onFocus={() => setExpanded(true)}
            onBlur={() => setExpanded(false)}
            className="flex items-center gap-2 text-left"
          >
            <span className="text-lg leading-none">☕</span>
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
                expanded ? "max-w-[260px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              Enjoying this? <span className="underline">Support this project</span>
            </span>
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
                expanded ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
              }`}
            >
              Tip the dev
            </span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            title="Hide for a while"
            aria-label="Hide donate badge"
            className="ml-1 flex h-6 w-6 flex-none items-center justify-center rounded-full text-amber-600 hover:bg-amber-200"
          >
            ×
          </button>
        </div>
      </div>
      <DonationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
