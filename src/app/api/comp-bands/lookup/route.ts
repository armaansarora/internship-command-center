/**
 * GET /api/comp-bands/lookup
 *
 * Auth-gated comp-band lookup. Reads from the global `company_comp_bands`
 * cache first (user-scoped client); on miss, scrapes Levels.fyi via Firecrawl
 * (admin client for budget + cache writes) and caches the result for 30 days.
 *
 * Query params (all required except `level`):
 *   - company
 *   - role
 *   - location
 *   - level (optional; defaults to "" on the cache key)
 *
 * Returns the `LookupResult` union shape from `lookupCompBands` directly —
 * clients pattern-match on `ok` + `reason` to render cards vs graceful-empty.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { lookupCompBands } from "@/lib/comp-bands/lookup";

export async function GET(req: NextRequest | Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const company = url.searchParams.get("company");
  const role = url.searchParams.get("role");
  const location = url.searchParams.get("location");
  const level = url.searchParams.get("level") ?? undefined;

  if (!company || !role || !location) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const userClient = await createClient();
  const admin = getSupabaseAdmin();
  const out = await lookupCompBands(userClient, admin, {
    company,
    role,
    location,
    level,
  });

  return NextResponse.json(out);
}
