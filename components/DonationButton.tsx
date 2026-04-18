"use client";

import { useEffect, useState } from "react";

const PRESET_AMOUNTS = [3, 5, 10, 25] as const;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;

type DonationButtonProps = {
  className?: string;
  label?: string;
};

export function DonationButton({
  className = "inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-300",
  label = "☕ Support this project",
}: DonationButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <DonationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type DonationModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DonationModal({ open, onClose }: DonationModalProps) {
  const [selected, setSelected] = useState<number>(5);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const parsedCustom = custom ? parseFloat(custom) : NaN;
  const effectiveAmount = Number.isFinite(parsedCustom) ? parsedCustom : selected;
  const amountIsValid =
    Number.isFinite(effectiveAmount) &&
    effectiveAmount >= MIN_AMOUNT &&
    effectiveAmount <= MAX_AMOUNT;

  const donate = async () => {
    setError("");
    if (!amountIsValid) {
      setError(`Please enter an amount between €${MIN_AMOUNT} and €${MAX_AMOUNT}.`);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount }),
      });
      let data: { checkoutUrl?: string; error?: string } = {};
      try {
        data = await resp.json();
      } catch {
        /* fall through */
      }
      if (!resp.ok || !data.checkoutUrl) {
        setError(
          data.error ||
            "Couldn't reach the payment provider. Please try again in a moment.",
        );
        setLoading(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network hiccup. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Support this project"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">☕</span>
            <div>
              <h2 className="font-display text-2xl text-ym-purple-dark">
                Support this project
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep the archive alive — every coffee helps.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="p-6 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Choose an amount
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((amt) => {
              const active = !custom && selected === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelected(amt);
                    setCustom("");
                    setError("");
                  }}
                  className={`rounded-xl border py-2.5 font-mono text-sm font-semibold transition ${
                    active
                      ? "border-amber-300 bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
                  }`}
                >
                  €{amt}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Or enter a custom amount
          </p>
          <div className="mt-3 flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-ym-purple focus-within:ring-1 focus-within:ring-ym-purple">
            <span className="select-none border-r border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-400">
              €
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step="1"
              placeholder="e.g. 15"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setError("");
              }}
              className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-slate-700 outline-none placeholder:text-slate-300"
            />
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <span>You&apos;re donating</span>
            <span className="font-mono text-base font-bold text-ym-purple">
              €{amountIsValid ? effectiveAmount.toFixed(2) : "—"}
            </span>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={donate}
            disabled={loading || !amountIsValid}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ym-purple px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ym-purple-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Redirecting to checkout…
              </>
            ) : (
              <>Donate €{amountIsValid ? effectiveAmount.toFixed(2) : "—"} →</>
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-400">
            🔒 Secure checkout via <span className="font-medium text-slate-500">Revolut</span> · No account needed
          </p>
        </div>
      </div>
    </div>
  );
}
