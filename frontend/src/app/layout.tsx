import type { Metadata, Viewport } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carbon Receipt — Turn receipts into your real carbon footprint",
  description:
    "Snap a shopping receipt and instantly see its real CO₂e footprint, understand it in tangible terms, track it over time, and reduce it with personalized swaps.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Carbon Receipt",
    description:
      "Turn everyday shopping receipts into a real carbon footprint — understand, track, reduce.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a8d56",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sora.variable} ${mono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
