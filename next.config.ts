import type { NextConfig } from "next";

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
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,
    autoInstrumentAppDirectory: false,
  });
} else {
  module.exports = nextConfig;
}

export default nextConfig;
