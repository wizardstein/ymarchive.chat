"use client";

import { replaceEmoticons } from "@/lib/emoticons";
import { formatTime } from "@/lib/format";
import type { YMMessage } from "@/lib/types";

export function MessageBubble({
  message,
  highlight,
}: {
  message: YMMessage;
  highlight?: string;
}) {
  if (message.isBuzz) {
    return (
      <div className="my-2 flex justify-center">
        <div className="animate-buzz rounded-full border border-amber-300 bg-amber-50 px-4 py-1 text-xs font-semibold text-amber-700">
          📳 {message.sender} sent a BUZZ! ·{" "}
          <span className="font-normal">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  const rendered = replaceEmoticons(message.text);
  const isLocal = message.isLocal;

  return (
    <div className={`flex ${isLocal ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          isLocal
            ? "rounded-br-sm bg-ym-purple text-white"
            : "rounded-bl-sm bg-white text-slate-900"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {highlight ? (
            <HighlightedText text={rendered} query={highlight} />
          ) : (
            rendered
          )}
        </div>
        <div
          className={`mt-1 text-[10px] ${
            isLocal ? "text-white/60" : "text-slate-400"
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const q = query.toLowerCase();
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let idx = lower.indexOf(q);
  let key = 0;
  while (idx >= 0) {
    if (idx > lastIdx) parts.push(text.slice(lastIdx, idx));
    parts.push(
      <mark
        key={key++}
        className="rounded bg-yellow-200 px-0.5 text-slate-900"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    lastIdx = idx + q.length;
    idx = lower.indexOf(q, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}
