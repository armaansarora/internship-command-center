#!/usr/bin/env tsx
/**
 * one-shot comp-bands seeder.
 *
 * Pre-populates `company_comp_bands` for a hand-curated roster of top
 * companies in a given sector. Writes are guarded by the same monthly
 * budget ceiling (450) as the live lookup flow — the seeder won't blow
 * through quota for the rest of the month.
 *
 * Usage:
 *   FIRECRAWL_API_KEY=... npx tsx scripts/comp-bands-seed.ts <sector>
 *
 * Runs with the service-role admin client (bypasses RLS) so it can read
 * the budget table AND write cache rows. The service role has full access
 * so we pass it as BOTH the userClient and admin arg to lookupCompBands —
 * the resolver doesn't care, it just needs two capable clients.
 */
import { getSupabaseAdmin } from "../src/lib/supabase/admin";
import { lookupCompBands } from "../src/lib/comp-bands/lookup";

interface SeedTarget {
  company: string;
  role: string;
  location: string;
  level?: string;
}

/**
 * Curated seeds per sector. Small on purpose — seeding runs burn Firecrawl
 * credits, so ship ~3 flagship companies per sector and grow the list as
 * real user offers surface roles we don't cover yet.
 */
const SECTORS: Record<string, SeedTarget[]> = {
  "real-estate": [
    { company: "Blackstone", role: "Real Estate Analyst", location: "New York, NY" },
    { company: "KKR", role: "Real Estate Analyst", location: "New York, NY" },
    { company: "Starwood Capital", role: "Real Estate Analyst", location: "Miami, FL" },
  ],
  "software-engineering": [
    { company: "Meta", role: "Software Engineer", location: "New York, NY" },
    { company: "Google", role: "Software Engineer", location: "Mountain View, CA" },
    { company: "Stripe", role: "Software Engineer", location: "San Francisco, CA" },
  ],
  "finance-banking": [
    { company: "Goldman Sachs", role: "Investment Banking Analyst", location: "New York, NY" },
    { company: "Morgan Stanley", role: "Investment Banking Analyst", location: "New York, NY" },
    { company: "JP Morgan", role: "Investment Banking Analyst", location: "New York, NY" },
  ],
  consulting: [
    { company: "McKinsey", role: "Business Analyst", location: "New York, NY" },
    { company: "BCG", role: "Associate", location: "New York, NY" },
    { company: "Bain", role: "Associate Consultant", location: "Boston, MA" },
  ],
};

async function main(): Promise<void> {
  const sector = process.argv[2];
  if (!sector || !SECTORS[sector]) {
    console.error("usage: comp-bands-seed.ts <sector>");
    console.error("sectors:", Object.keys(SECTORS).join(", "));
    process.exit(1);
  }
  const admin = getSupabaseAdmin();
  for (const target of SECTORS[sector]) {
    const out = await lookupCompBands(admin, admin, target);
    console.log(
      `${target.company} / ${target.role} / ${target.location} →`,
      JSON.stringify(out),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
