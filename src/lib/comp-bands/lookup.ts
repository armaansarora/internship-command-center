/**
 * Comp-bands cache-first resolver.
 *
 * Single orchestration point for the comp-band lookup flow. The four exit
 * paths (design-doc §4.5):
 *
 *   1. Cache hit  → return {ok:true, fromCache:true} from `company_comp_bands`.
 *   2. No API key → return {ok:false, reason:"no_key"} — no network attempt.
 *   3. Over budget → return {ok:false, reason:"over_budget"} — graceful-empty.
 *   4. Scrape run → increment budget, hit Firecrawl, write cache (or "empty").
 *
 * The budget counter is incremented BEFORE the scrape call so a failed
 * scrape still counts against the ceiling — Firecrawl charges on request,
 * not on success, and over-counting is safer than busting the hard quota.
 *
 * `userClient` reads from the global cache (authenticated SELECT is allowed
 * by RLS). `admin` is required for both budget ops and cache writes
 * (service-role only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCompanyName } from "@/lib/db/queries/offers-rest";
import { getCachedBands, upsertBands } from "@/lib/db/queries/comp-bands-rest";
import { scrapeLevelsFyi } from "./firecrawl";
import { canScrapeThisMonth, incrementScrapeCount } from "./budget";

export type LookupResult =
  | {
      ok: true;
      base: { p25: number; p50: number; p75: number };
      bonus: { p25: number; p50: number; p75: number };
      equity: { p25: number; p50: number; p75: number };
      sampleSize: number;
      source: string;
      fromCache: boolean;
    }
  | { ok: false; reason: "empty" | "over_budget" | "no_key" };

export async function lookupCompBands(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  input: { company: string; role: string; location: string; level?: string },
): Promise<LookupResult> {
  const norm = normalizeCompanyName(input.company);

  // Step 1 — cache-first. Non-expired rows short-circuit the whole flow.
  const cached = await getCachedBands(userClient, {
    companyNameNormalized: norm,
    role: input.role,
    location: input.location,
    level: input.level ?? "",
  });
  if (cached) {
    return {
      ok: true,
      base: {
        p25: cached.base_p25 ?? 0,
        p50: cached.base_p50 ?? 0,
        p75: cached.base_p75 ?? 0,
      },
      bonus: {
        p25: cached.bonus_p25 ?? 0,
        p50: cached.bonus_p50 ?? 0,
        p75: cached.bonus_p75 ?? 0,
      },
      equity: {
        p25: cached.equity_p25 ?? 0,
        p50: cached.equity_p50 ?? 0,
        p75: cached.equity_p75 ?? 0,
      },
      sampleSize: cached.sample_size,
      source: cached.source,
      fromCache: true,
    };
  }

  // Step 2 — env gate. No key → caller renders graceful-empty.
  if (!process.env.FIRECRAWL_API_KEY) {
    return { ok: false, reason: "no_key" };
  }

  // Step 3 — budget gate. Over the 450-ceiling → graceful-empty.
  if (!(await canScrapeThisMonth(admin))) {
    return { ok: false, reason: "over_budget" };
  }

  // Step 4 — scrape. Count the credit BEFORE the HTTP call so even failures
  // burn the budget row honestly.
  await incrementScrapeCount(admin);
  const scraped = await scrapeLevelsFyi(input.company, input.role, input.location);
  if (!scraped) return { ok: false, reason: "empty" };

  await upsertBands(admin, {
    company_name_normalized: norm,
    role: input.role,
    location: input.location,
    level: input.level ?? "",
    base_p25: scraped.basePercentiles.p25,
    base_p50: scraped.basePercentiles.p50,
    base_p75: scraped.basePercentiles.p75,
    bonus_p25: scraped.bonusPercentiles.p25,
    bonus_p50: scraped.bonusPercentiles.p50,
    bonus_p75: scraped.bonusPercentiles.p75,
    equity_p25: scraped.equityPercentiles.p25,
    equity_p50: scraped.equityPercentiles.p50,
    equity_p75: scraped.equityPercentiles.p75,
    sample_size: scraped.sampleSize,
  });

  return {
    ok: true,
    base: scraped.basePercentiles,
    bonus: scraped.bonusPercentiles,
    equity: scraped.equityPercentiles,
    sampleSize: scraped.sampleSize,
    source: "levels.fyi",
    fromCache: false,
  };
}
