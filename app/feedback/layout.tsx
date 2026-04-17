import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback & bug reports",
  description:
    "Send feedback, feature requests, or bug reports about YM Archive Viewer. Messages go directly to the developer — no ticket system, no tracking.",
  alternates: {
    canonical: "/feedback",
  },
  openGraph: {
    type: "website",
    url: "https://ymarchive.chat/feedback",
    title: "Feedback & bug reports · YM Archive Viewer",
    description:
      "Send feedback, feature requests, or bug reports about YM Archive Viewer.",
  },
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
