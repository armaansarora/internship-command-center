import type { Metadata } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { LAUNCH_CONFIG } from "@/lib/launch-config";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

const FOOTER_LINKS = [
  { href: "/lobby", label: "Sign in" },
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="relative min-h-dvh">
      {/* Backdrop — gradient mirrors lobby's "cold marble at night" mood without
          loading the heavy ProceduralSkyline canvas. Public pages are on the
          critical path; we keep them fast. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(201, 168, 76, 0.05) 0%, transparent 50%), linear-gradient(180deg, #0A0A14 0%, #1A1A2E 100%)",
        }}
      />
      <header className="px-6 py-6 md:px-12 md:py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-baseline gap-2 transition-opacity hover:opacity-80"
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "22px",
                fontWeight: 700,
                color: "#C9A84C",
                letterSpacing: "0.02em",
              }}
            >
              {LAUNCH_CONFIG.brand.name}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              The Tower
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            {LAUNCH_CONFIG.flags.pricingPublic && (
              <Link
                href="/pricing"
                className="text-sm text-white/70 transition-colors hover:text-white"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                Pricing
              </Link>
            )}
            <Link
              href="/lobby"
              className="rounded-lg px-4 py-2 text-sm transition-all"
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontWeight: 600,
                background: "rgba(201, 168, 76, 0.12)",
                border: "1px solid rgba(201, 168, 76, 0.3)",
                color: "#C9A84C",
              }}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="px-6 pb-24 md:px-12">{children}</main>
      <footer
        className="px-6 py-10 md:px-12"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10, 12, 25, 0.4)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "16px",
                color: "#C9A84C",
              }}
            >
              {LAUNCH_CONFIG.brand.name}
            </span>
            <span
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {LAUNCH_CONFIG.brand.tagline}
            </span>
          </div>
          <nav className="flex flex-wrap gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-white/50 transition-colors hover:text-white/90"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.08em",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div
          className="mx-auto mt-6 max-w-6xl text-center md:text-left"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em",
          }}
        >
          © {new Date().getUTCFullYear()} {LAUNCH_CONFIG.brand.legalEntity}. Last
          revised {LAUNCH_CONFIG.brand.legalRevisedOn}.
        </div>
      </footer>
    </div>
  );
}
