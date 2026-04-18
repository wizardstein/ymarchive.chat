import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank you — YM Archive Viewer",
  description: "Thanks for supporting the project.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ym-cream px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="text-5xl">☕</div>
        <h1 className="mt-4 font-display text-4xl text-ym-purple-dark">
          Thank you!
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Your support means a lot. The archive stays free and alive because
          of people like you.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ym-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ym-purple-dark"
        >
          ← Back to the archive
        </Link>
      </div>
    </main>
  );
}
