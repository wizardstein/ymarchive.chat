import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open your Yahoo! Messenger archive",
  description:
    "Drop in your Yahoo! Messenger Profiles folder or .zip archive to browse conversations. Everything is decoded locally in your browser — nothing is uploaded.",
  alternates: {
    canonical: "/viewer",
  },
  openGraph: {
    type: "website",
    url: "https://ymarchive.chat/viewer",
    title: "Open your Yahoo! Messenger archive · YM Archive Viewer",
    description:
      "Drop in your Yahoo! Messenger Profiles folder or .zip to browse conversations. Decoded locally in your browser.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open your Yahoo! Messenger archive",
    description:
      "Drop in your Yahoo! Messenger Profiles folder or .zip to browse conversations. Decoded locally in your browser.",
  },
};

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
