/**
 * Comp-bands REST helpers.
 *
 * Typed Supabase REST surface for the `company_comp_bands` global cache
 * (ships in migration 0020, R10.1). This is a GLOBAL cache — every
 * authenticated user reads the same rows. Reads go through the user-scoped
 * Supabase client; writes require the service-role admin because the
 * cache is populated by scraping flows that no individual user "owns."
 *
 * Cache entries expire 30 days after `scraped_at`. `getCachedBands` filters
 * out expired rows at read time (`expires_at > now()`), so upstream callers
 * can treat a null result as "miss" without worrying about stale data.
 *
 * Shape note: mirrors the offers-rest contract — functions take an injected
 * SupabaseClient as their first arg and throw on error.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Row } from "@/db/database.types";

/** Raw snake_case `company_comp_bands` row (Fix #5). */
export type CompBandsRow = Row<"company_comp_bands">;

/**
 * Read a non-expired cache row for the given (company, role, location, level)
 * tuple. Returns null on miss or when the only matching row is expired.
 * `level` defaults to "" which matches how `upsertBands` stores role entries
 * that don't carry a leveling signal.
 */
export async function getCachedBands(
  client: SupabaseClient,
  params: {
    companyNameNormalized: string;
    role: string;
    location: string;
    level?: string;
  },
): Promise<CompBandsRow | null> {
  const { data, error } = await client
    .from("company_comp_bands")
    .select("*")
    .eq("company_name_normalized", params.companyNameNormalized)
    .eq("role", params.role)
    .eq("location", params.location)
    .eq("level", params.level ?? "")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`getCachedBands: ${error.message}`);
  return (data as CompBandsRow | null) ?? null;
}

/**
 * Write or refresh a cache row for the given (company, role, location, level)
 * tuple. Sets `scraped_at = now()` and `expires_at = now() + 30 days`.
 * Upsert is keyed on the composite unique index shipped in migration 0020.
 *
 * Requires the service-role admin client — RLS on `company_comp_bands`
 * allows authenticated SELECT only; writes are service-role only.
 */
export async function upsertBands(
  admin: SupabaseClient,
  input: Omit<CompBandsRow, "id" | "scraped_at" | "expires_at" | "source"> &
    Partial<Pick<CompBandsRow, "source">>,
): Promise<void> {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const row = {
    ...input,
    source: input.source ?? "levels.fyi",
    scraped_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };
  const { error } = await admin
    .from("company_comp_bands")
    .upsert(row, {
      onConflict: "company_name_normalized,role,location,level",
    });
  if (error) throw new Error(`upsertBands: ${error.message}`);
}
