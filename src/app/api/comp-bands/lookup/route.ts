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
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { lookupCompBands } from "@/lib/comp-bands/lookup";

const MAX_LOOKUP_PARAM_LENGTH = 120;

function normalizeQueryParam(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function hasOversizedParam(values: Array<string | null | undefined>): boolean {
  return values.some((value) => (value?.length ?? 0) > MAX_LOOKUP_PARAM_LENGTH);
}

export async function GET(req: NextRequest | Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const company = normalizeQueryParam(url.searchParams.get("company"));
  const role = normalizeQueryParam(url.searchParams.get("role"));
  const location = normalizeQueryParam(url.searchParams.get("location"));
  const level = normalizeQueryParam(url.searchParams.get("level")) ?? undefined;

  if (!company || !role || !location) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  if (hasOversizedParam([company, role, location, level])) {
    return NextResponse.json({ error: "param_too_long" }, { status: 400 });
  }

  const rate = await withRateLimit(auth.user.id, "B");
  if (rate.response) return rate.response;

  const userClient = await createClient();
  const admin = getSupabaseAdmin();
  const out = await lookupCompBands(userClient, admin, {
    company,
    role,
    location,
    level,
  });

  return NextResponse.json(out, { headers: rate.headers });
}
