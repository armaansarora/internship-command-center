import type { Metadata, Viewport } from "next";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* ─── Fonts ──────────────────────────────────────────────────────────
   Playfair Display: display headings (serif, gold accents)
   JetBrains Mono: data/monospace (floor labels, stats, code)
   Satoshi: loaded via Fontshare CDN in <head> — primary body font
   ──────────────────────────────────────────────────────────────────── */

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "The Tower — Command Center",
    template: "%s | The Tower",
  },
  description:
    "Multi-tenant SaaS for automating internship and job searches. AI-powered pipeline management, email parsing, interview prep, and more.",
  robots: { index: false, follow: false }, // Private app — no crawling
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-time="night"
      className={`${playfairDisplay.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        {/* Satoshi from Fontshare — primary body font */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh font-body text-[var(--text-primary)] bg-[var(--tower-darkest)] overflow-hidden">
        {children}
      </body>
    </html>
  );
}
