"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BUY_ME_A_COFFEE_URL } from "@/lib/links";

const SUBJECT_LINES = {
  bug: "🐛 Bug report",
  feature: "✨ Feature idea",
  feedback: "💬 General feedback",
} as const;

type Kind = keyof typeof SUBJECT_LINES;

export default function FeedbackPage() {
  const [kind, setKind] = useState<Kind>("bug");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const diagnostics = useMemo(() => {
    if (typeof window === "undefined") return "";
    return [
      `User agent: ${navigator.userAgent}`,
      `Language:   ${navigator.language}`,
      `Viewport:   ${window.innerWidth}×${window.innerHeight}`,
      `Pixel DPR:  ${window.devicePixelRatio}`,
      `Time:       ${new Date().toISOString()}`,
    ].join("\n");
  }, []);

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked — silently ignore
    }
  };

  const submit = async () => {
    setSendError(null);
    if (body.trim().length < 5) {
      setSendError("Please add a few more words before sending.");
      return;
    }
    setSending(true);
    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body, diagnostics }),
      });
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = await resp.json();
      } catch {
        // fall through
      }
      if (!resp.ok || !data.ok) {
        setSendError(
          data.error ||
            "The message didn't go through. Please try again, or leave a message on Buy Me a Coffee.",
        );
        return;
      }
      setSent(true);
      setBody("");
    } catch {
      setSendError(
        "Network hiccup. Check your connection and try again, or leave a message on Buy Me a Coffee.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-ym-cream">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-ym-purple"
        >
          ← Back home
        </Link>

        <h1 className="mt-6 font-display text-4xl text-ym-purple-dark">
          Feedback & bug reports
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          This is a one-person project. Your message goes straight to whoever
          built it — there&apos;s no ticket system, no bot, no autoresponder.
          Replies may be slow, but your weird edge case will actually be read
          by a human.
        </p>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">✅</div>
              <h2 className="font-display text-2xl text-ym-purple-dark">
                Message sent — thank you!
              </h2>
              <p className="text-sm text-slate-600">
                It landed in the developer&apos;s inbox. If you included an
                email address in the body, you may hear back; otherwise this
                is a one-way kind of thing.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setBody("");
                }}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:border-ym-purple hover:text-ym-purple"
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                What kind of message is this?
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(SUBJECT_LINES) as Kind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      kind === k
                        ? "bg-ym-purple text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {SUBJECT_LINES[k]}
                  </button>
                ))}
              </div>

              <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tell them about it
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder={
                  kind === "bug"
                    ? "What did you expect to happen, what happened instead, and roughly what was in your archive?"
                    : kind === "feature"
                      ? "What would you like to see? What problem does it solve for you?"
                      : "Anything on your mind — the good, the bad, the weirdly specific."
                }
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-ym-purple focus:outline-none focus:ring-1 focus:ring-ym-purple"
              />

              <details className="mt-4 text-xs text-slate-500">
                <summary className="cursor-pointer select-none font-medium">
                  Diagnostic info that will be attached (optional)
                </summary>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                  {diagnostics}
                </pre>
                <button
                  type="button"
                  onClick={copyDiagnostics}
                  className="mt-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-ym-purple hover:text-ym-purple"
                >
                  {copied ? "Copied!" : "Copy diagnostics"}
                </button>
              </details>

              {sendError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {sendError}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={sending}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ym-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ym-purple-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending…" : "✉️ Send"}
              </button>
              <p className="mt-3 text-[11px] text-slate-400">
                Sent through a small serverless relay on this site&apos;s own
                server. No third-party trackers, no mail client pop-up — just
                your message and (optionally) the diagnostics.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-display text-xl text-amber-900">
            Prefer public comments?
          </h2>
          <p className="mt-2 text-sm text-amber-900/80">
            You can also leave a public note (and optionally tip the
            developer a coffee) on Buy Me a Coffee.
          </p>
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-300"
          >
            ☕ Leave a message on Buy Me a Coffee →
          </a>
        </div>
      </div>
    </main>
  );
}
