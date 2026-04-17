import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YM Archive Viewer — Browse your old Yahoo! Messenger conversations",
  description:
    "Open your old Yahoo! Messenger archive and browse your conversations in your browser. 100% private — your files never leave your device.",
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
