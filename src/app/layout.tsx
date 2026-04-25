import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import { LAUNCH_CONFIG } from "@/lib/launch-config";
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
  metadataBase: new URL(LAUNCH_CONFIG.brand.url()),
  title: {
    default: `${LAUNCH_CONFIG.brand.name} — Command Center`,
    template: `%s | ${LAUNCH_CONFIG.brand.name}`,
  },
  description: LAUNCH_CONFIG.brand.tagline,
  // Default: don't index. Marketing routes opt back in via their own layout.
  robots: { index: false, follow: false },
  openGraph: {
    title: `${LAUNCH_CONFIG.brand.name} — ${LAUNCH_CONFIG.brand.tagline}`,
    description: LAUNCH_CONFIG.brand.tagline,
    siteName: LAUNCH_CONFIG.brand.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: LAUNCH_CONFIG.brand.name,
    description: LAUNCH_CONFIG.brand.tagline,
  },
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
        {/* Plausible — cookie-less, privacy-first analytics. Loads only when
            NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. No-op at build time when
            absent so dev/preview don't ping an analytics endpoint that
            doesn't exist. */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={
              process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ??
              "https://plausible.io/js/script.js"
            }
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="min-h-dvh font-body text-[var(--text-primary)] bg-[var(--tower-darkest)]">
        {children}
      </body>
    </html>
  );
}
