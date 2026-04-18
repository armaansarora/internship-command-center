import type { NextConfig } from "next";

/* ─── Content Security Policy (Report-Only) ──────────────────────────────
   Shipped in REPORT-ONLY mode so violations are logged in the browser
   console but nothing is blocked. Once the CSP has been observed clean
   in production for a release cycle, swap the header name to
   `Content-Security-Policy` (drop the `-Report-Only`) to enforce.

   Relaxations:
   - 'unsafe-inline' / 'unsafe-eval' for scripts: required by Next.js
     development bootstrap and GSAP runtime; tightenable via nonces in
     a follow-up.
   - 'unsafe-inline' for styles: required by Tailwind JIT + inline style
     props sprinkled across the immersive UI.
   - Stripe iframes (js.stripe.com, hooks.stripe.com) for checkout.
   - Supabase REST + WebSocket for data + realtime.
   - OpenAI / Anthropic for in-browser SSE streaming where applicable.
   ───────────────────────────────────────────────────────────────────── */
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.vercel.app",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Force HTTPS for two years on all subdomains. `preload` opts the
  // domain into the browser-shipped HSTS preload list (one-way ticket).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block MIME-type sniffing — never let the browser guess a script
  // out of an image response.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Hard clickjacking ban — no framing of any page from any origin.
  // (Stripe Checkout opens in a top-level redirect, not an iframe of
  // our app, so DENY is safe globally.)
  { key: "X-Frame-Options", value: "DENY" },
  // Don't leak the full URL (with query params / user IDs) to
  // third-party origins via the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful sensors. Microphone left as `self` for future
  // voice mode (CEO chat by voice).
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  // Report-only — see comment above. Flip to enforce when stable.
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "gsap",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "xstate",
      "@xstate/react",
      "zod",
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry only when DSN is configured. Use dynamic require rather
// than import so the Sentry build-time dependency is skipped in environments
// that haven't configured telemetry.
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require("@sentry/nextjs") as {
    withSentryConfig: (
      config: NextConfig,
      opts: Record<string, unknown>
    ) => NextConfig;
  };

  module.exports = withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG ?? "",
    project: process.env.SENTRY_PROJECT ?? "",
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: false,
    autoInstrumentAppDirectory: true,
  });
} else {
  module.exports = nextConfig;
}

export default nextConfig;
