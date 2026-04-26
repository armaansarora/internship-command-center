/**
 * Firecrawl monthly budget tracking.
 *
 * Firecrawl's free tier caps us at 500 scrape credits per calendar month.
 * We gate ourselves at 450 (50-credit safety buffer) so a race between the
 * "can we scrape?" check and the actual HTTP call can't push us over the
 * hard ceiling. When we hit 450, lookups return {ok:false, reason:"over_budget"}
 * and the UI renders graceful-empty.
 *
 * Storage: `comp_bands_budget` — a single row per `month_key` (YYYY-MM).
 * RLS: no authenticated-user policies — service role only. `canScrapeThisMonth`
 * and `incrementScrapeCount` both require the admin client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const FIRECRAWL_MONTHLY_LIMIT = 500;
export const FIRECRAWL_SAFETY_BUFFER = 50;

/**
 * Return the current UTC calendar month as a "YYYY-MM" string. Used as the
 * primary key into `comp_bands_budget`. UTC (not local) so the reset is
 * deterministic regardless of the runtime's timezone.
 */
export function currentMonthKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Ask whether another scrape fits under this month's ceiling. Reads the
 * current month's row; if missing (new month) count is 0 and we're safely
 * under. Returns false when count >= limit - buffer (450).
 */
export async function canScrapeThisMonth(admin: SupabaseClient): Promise<boolean> {
  const key = currentMonthKey();
  const { data } = await admin
    .from("comp_bands_budget")
    .select("scrape_count")
    .eq("month_key", key)
    .maybeSingle();
  const count = (data?.scrape_count as number | undefined) ?? 0;
  return count < FIRECRAWL_MONTHLY_LIMIT - FIRECRAWL_SAFETY_BUFFER;
}

/**
 * Record that we've spent one scrape credit. Read-then-upsert by `month_key`
 * to both insert the first row of a new month and bump an existing one.
 *
 * We increment BEFORE the actual fetch in `lookupCompBands` so a failed
 * scrape still counts against the budget — Firecrawl charges on request,
 * not on success, and we'd rather over-count than bust the ceiling.
 */
export async function incrementScrapeCount(admin: SupabaseClient): Promise<void> {
  const key = currentMonthKey();
  const { data } = await admin
    .from("comp_bands_budget")
    .select("scrape_count")
    .eq("month_key", key)
    .maybeSingle();
  const next = ((data?.scrape_count as number | undefined) ?? 0) + 1;
  await admin
    .from("comp_bands_budget")
    .upsert(
      {
        month_key: key,
        scrape_count: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "month_key" },
    );
}
