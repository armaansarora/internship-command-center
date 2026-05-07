import type { NextConfig } from "next";

/* ─── Content Security Policy ─────────────────────────────────────────────
   Relaxations:
   - 'unsafe-inline' for scripts: required by the current Next.js/GSAP
     runtime path; tightenable via nonces in a follow-up.
   - 'unsafe-eval' is development-only for Next.js bootstrap.
   - 'unsafe-inline' for styles: required by Tailwind JIT + inline style
     props sprinkled across the immersive UI.
   - Stripe iframes (js.stripe.com, hooks.stripe.com) for checkout.
   - Supabase REST + WebSocket for data + realtime.
   - OpenAI / Anthropic for in-browser SSE streaming where applicable.
   ───────────────────────────────────────────────────────────────────── */
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  "https://js.stripe.com",
  "https://*.vercel.app",
  "https://plausible.io",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://api.stripe.com https://plausible.io https://*.ingest.sentry.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
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
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
