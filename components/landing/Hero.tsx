import Link from "next/link";

export function Hero() {
  return (
    <section className="gradient-purple relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 35%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest backdrop-blur-sm">
          2003 – 2012 archives supported
        </p>
        <h1 className="font-display text-5xl leading-tight sm:text-7xl">
          Your 2007 conversations,
          <br />
          <span className="text-yellow-200">back from the dead.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm uppercase tracking-[0.2em] text-white/70">
          A Yahoo! Messenger archive viewer for your old .dat files
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">
          Drop in your old Yahoo! Messenger profile folder — or a zip of it —
          and browse every message exactly as it was. Works on Mac, Windows,
          and Linux. Decoded entirely in your browser — no upload, no account,
          nothing stored.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/viewer"
            className="rounded-full bg-yellow-300 px-8 py-4 text-lg font-bold text-ym-purple-dark shadow-retro transition hover:-translate-y-0.5 hover:bg-yellow-200"
          >
            Open your archive →
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-full border border-white/40 px-6 py-4 text-sm text-white/90 hover:bg-white/10"
          >
            How does this work?
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/60">
          🔒 Files never leave your device · 💸 Free forever · 🗑️ Nothing stored
        </p>
      </div>
    </section>
  );
}
