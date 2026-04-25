import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotcoin",
  description: "Peer recognition platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.className} ${GeistMono.variable}`}>
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
