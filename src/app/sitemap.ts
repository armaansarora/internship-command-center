import type { MetadataRoute } from "next";
import { LAUNCH_CONFIG } from "@/lib/launch-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = LAUNCH_CONFIG.brand.url();
  const lastModified = new Date(LAUNCH_CONFIG.brand.legalRevisedOn);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/lobby`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/terms`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];

  if (LAUNCH_CONFIG.flags.pricingPublic) {
    entries.push({ url: `${base}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.9 });
  }
  if (LAUNCH_CONFIG.flags.waitlistPublic) {
    entries.push({ url: `${base}/waitlist`, lastModified, changeFrequency: "weekly", priority: 0.9 });
  }

  return entries;
}
