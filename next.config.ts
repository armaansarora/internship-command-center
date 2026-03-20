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
      "drizzle-orm",
      "zod",
    ],
  },
};

// Wrap with Sentry only when DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  // Dynamic require to avoid import-time errors when Sentry is not configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require("@sentry/nextjs") as {
    withSentryConfig: (
      config: NextConfig,
      opts: Record<string, unknown>
    ) => NextConfig;
  };

  module.exports = withSentryConfig(nextConfig, {
    // Suppress source-map upload warnings when token is absent
    silent: true,
    org: process.env.SENTRY_ORG ?? "",
    project: process.env.SENTRY_PROJECT ?? "",
    // Disable automatic instrumentation file generation
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,
    autoInstrumentAppDirectory: false,
  });
} else {
  module.exports = nextConfig;
}
