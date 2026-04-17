import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { TrustPillars } from "@/components/landing/TrustPillars";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DemoPreview } from "@/components/landing/DemoPreview";
import { FAQ, FAQS } from "@/components/landing/FAQ";
import { BUY_ME_A_COFFEE_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: {
    absolute:
      "Yahoo! Messenger Archive Viewer — read your old .dat conversations in-browser",
  },
  description:
    "A free, private Yahoo! Messenger archive viewer. Open your old Profiles folder or .zip and browse every conversation — .dat files are decoded locally in your browser. No upload, no account, no tracking.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://ymarchive.chat/",
    title:
      "Yahoo! Messenger Archive Viewer — read your old .dat conversations in-browser",
    description:
      "Open your old Yahoo! Messenger Profiles folder or .zip and browse every conversation. 100% client-side — your files never leave your device.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yahoo! Messenger Archive Viewer",
    description:
      "Open your old Yahoo! Messenger Profiles folder or .zip and browse every conversation. 100% client-side.",
  },
};

// JSON-LD structured data. Inlined in the server component so search engines
// see it on first render. No runtime cost, no tracking.
function StructuredData() {
  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "YM Archive Viewer",
    alternateName: "Yahoo! Messenger Archive Viewer",
    url: "https://ymarchive.chat/",
    description:
      "Browser-based viewer for old Yahoo! Messenger .dat archive files. Open your Profiles folder or zip and browse every conversation. 100% client-side — files never leave your device.",
    applicationCategory: "UtilitiesApplication",
    applicationSubCategory: "Archive Viewer",
    operatingSystem: "Any (web browser)",
    browserRequirements:
      "Requires a modern browser with JavaScript enabled (Chrome, Firefox, Safari, Edge).",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
    inLanguage: ["en", "ro"],
    featureList: [
      "Opens Yahoo! Messenger Profiles folders and .zip archives",
      "Decodes .dat files locally using the original XOR-with-username scheme",
      "Multi-profile support with automatic deduplication across snapshots",
      "Full-text search and date-range filtering within a conversation",
      "Adaptive timeline histogram (day/month/year buckets)",
      "Classic Yahoo emoticons rendered as emoji",
      "Profile avatar extraction from My Icons/Index.ini",
      "Instant reopen via IndexedDB cache — no re-upload needed",
      "Works on Mac, Windows, Linux, and ChromeOS",
      "100% client-side — no server upload, no account, no tracking",
    ],
    creator: {
      "@type": "Organization",
      name: "YM Archive Viewer",
      url: "https://ymarchive.chat/",
    },
    privacyPolicy: "https://ymarchive.chat/#faq",
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to open a Yahoo! Messenger archive in your browser",
    description:
      "Three steps to browse your old Yahoo! Messenger .dat archive files locally in your browser — nothing is uploaded.",
    totalTime: "PT2M",
    tool: [
      {
        "@type": "HowToTool",
        name: "A modern web browser (Chrome, Firefox, Safari, or Edge)",
      },
      {
        "@type": "HowToSupply",
        name: "Your Yahoo! Messenger Profiles folder or a .zip of it",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Point us at your archive",
        text: "Drag in a folder (profiles1, profiles2, or whatever you named it), a parent folder containing several of those, or a .zip. The browser reads it — nothing is uploaded anywhere.",
        url: "https://ymarchive.chat/#how-it-works",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Decoded in your browser",
        text: "We parse the .dat files and reverse Yahoo's XOR scheme right on your device. Everything happens locally in JavaScript.",
        url: "https://ymarchive.chat/#how-it-works",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Browse your chats",
        text: "Every conversation, every buzz, every smiley. Search, filter by date, and scroll through years of history.",
        url: "https://ymarchive.chat/#how-it-works",
      },
    ],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "YM Archive Viewer",
    url: "https://ymarchive.chat/",
    logo: "https://ymarchive.chat/icon",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "YM Archive Viewer",
    url: "https://ymarchive.chat/",
    inLanguage: "en",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}

export default function LandingPage() {
  return (
    <main>
      <StructuredData />
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
        <p className="mx-auto mt-3 max-w-xl px-6 text-xs text-white/50">
          This tool decodes files you point it at. It performs no ownership
          check and doesn&apos;t assume responsibility for what you choose to
          read — please respect the privacy of anyone whose conversations
          end up in your archive.
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
