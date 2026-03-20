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
    optimizePackageImports: ["gsap", "drizzle-orm", "zod"],
  },
};

export default nextConfig;
