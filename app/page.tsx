import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { TrustPillars } from "@/components/landing/TrustPillars";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DemoPreview } from "@/components/landing/DemoPreview";
import { FAQ } from "@/components/landing/FAQ";
import { BUY_ME_A_COFFEE_URL } from "@/lib/links";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <TrustPillars />
      <DemoPreview />
      <HowItWorks />
      <FAQ />
      <footer className="bg-ym-purple-dark py-10 text-center text-sm text-white/70">
        <p>
          Built with ❤️ for everyone who still has that zip in a forgotten
          folder. No cookies. No tracking. No accounts.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link
            href="/feedback"
            className="rounded-full border border-white/20 px-4 py-1.5 text-white/80 transition hover:border-white/60 hover:text-white"
          >
            💬 Feedback or bug report
          </Link>
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-amber-400 px-4 py-1.5 font-semibold text-amber-950 transition hover:bg-amber-300"
          >
            ☕ Buy me a coffee
          </a>
        </div>
      </footer>
    </main>
  );
}
