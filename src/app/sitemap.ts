import type { MetadataRoute } from "next";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { LEGAL_CONFIG } from "@/lib/config/legal-config";
import { PRICING_CONFIG } from "@/lib/config/pricing-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = GATE_CONFIG.brand.url();
  const lastModified = new Date(LEGAL_CONFIG.entity.legalRevisedOn);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/lobby`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/terms`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];

  if (PRICING_CONFIG.flags.pricingPublic) {
    entries.push({ url: `${base}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.9 });
  }
  if (GATE_CONFIG.flags.waitlistPublic) {
    entries.push({ url: `${base}/waitlist`, lastModified, changeFrequency: "weekly", priority: 0.9 });
  }

  return entries;
}
