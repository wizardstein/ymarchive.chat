import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ymarchive.chat"),
  title: {
    default:
      "YM Archive Viewer — Open old Yahoo! Messenger archives in your browser",
    template: "%s · YM Archive Viewer",
  },
  description:
    "Open your old Yahoo! Messenger Profiles folder or .zip archive and browse every conversation in your browser. Decodes .dat files locally — your files never leave your device. Free, private, no account.",
  applicationName: "YM Archive Viewer",
  keywords: [
    "yahoo messenger archive viewer",
    "open yahoo messenger dat files",
    "read old yahoo messenger conversations",
    "yahoo messenger profiles folder reader",
    "decode yahoo messenger dat file",
    "yahoo messenger archive",
    "ym archive",
    "yahoo messenger history",
    "arhiva yahoo messenger",
    "citeste conversatii yahoo messenger",
  ],
  authors: [{ name: "YM Archive Viewer" }],
  creator: "YM Archive Viewer",
  publisher: "YM Archive Viewer",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "YM Archive Viewer",
    locale: "en_US",
    url: "https://ymarchive.chat",
    title:
      "YM Archive Viewer — Open old Yahoo! Messenger archives in your browser",
    description:
      "Drop in your old Yahoo! Messenger Profiles folder or .zip and browse every conversation. 100% client-side — your files never leave your device.",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "YM Archive Viewer — Open old Yahoo! Messenger archives in your browser",
    description:
      "Drop in your old Yahoo! Messenger Profiles folder or .zip and browse every conversation. 100% client-side — your files never leave your device.",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#6f2da8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
