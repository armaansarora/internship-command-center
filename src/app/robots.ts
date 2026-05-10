import type { MetadataRoute } from "next";
import { GATE_CONFIG } from "@/lib/config/gate-config";

/**
 * Public crawlable surface = the marketing pages. Everything inside the
 * authenticated app is gated by Supabase Auth and not indexable anyway, but
 * we make it explicit. /api/* gets blocked because crawlers should never
 * hit our endpoints.
 */
export default function robots(): MetadataRoute.Robots {
  const base = GATE_CONFIG.brand.url();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/terms", "/privacy", "/waitlist", "/lobby"],
        disallow: ["/api/", "/penthouse", "/war-room", "/c-suite", "/observatory", "/parlor", "/rolodex-lounge", "/situation-room", "/briefing-room", "/writing-room", "/settings"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
