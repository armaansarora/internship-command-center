import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rebuildMatchIndexForUser } from "@/lib/networking/rebuild-match-index";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/match-index
 *
 * R11.3 — nightly match-index populator.  Iterates every consented user
 * (networking_consent_at IS NOT NULL) and rebuilds their
 * match_candidate_index via `rebuildMatchIndexForUser`.  Stale consent
 * versions are handled inside the helper (it clears the user's cache +
 * returns written=0), so we don't double-filter here — we just need the
 * consent_at NOT-NULL predicate to avoid waking up users who never
 * opted in.
 *
 * Shape mirrors `/api/cron/briefing/route.ts`:
 *   - `verifyCronRequest` enforces Bearer CRON_SECRET OR `x-vercel-cron: 1`.
 *   - PAGE_SIZE = 500 for the paginated user fetch.
 *   - WORKERS = 6 parallel per-user rebuilds bounded by a queue.
 *   - Per-user errors are logged + recorded as `status: "error"` but
 *     don't halt the batch (fail-closed per user, not per cron).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_SIZE = 500;
const WORKERS = 6;

interface UserRow {
  id: string;
}

interface UserResult {
  userId: string;
  status: "ok" | "error";
  written?: number;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();
  const results: UserResult[] = [];

  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: users, error } = await admin
      .from("user_profiles")
      .select("id")
      .not("networking_consent_at", "is", null)
      .range(from, to)
      .order("id", { ascending: true });

    if (error) {
      log.error("cron.match_index.fetch_users_failed", error, { page });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const batch = ((users ?? []) as UserRow[]) ?? [];
    if (batch.length === 0) break;

    const queue = [...batch];
    await Promise.all(
      Array.from({ length: Math.min(WORKERS, batch.length) }, async () => {
        for (;;) {
          const u = queue.pop();
          if (!u) return;
          try {
            const res = await rebuildMatchIndexForUser(u.id);
            results.push({ userId: u.id, status: "ok", written: res.written });
          } catch (err) {
            log.warn("cron.match_index.user_failed", {
              userId: u.id,
              error: err instanceof Error ? err.message : "unknown",
            });
            results.push({ userId: u.id, status: "error" });
          }
        }
      }),
    );

    if (batch.length < PAGE_SIZE) break;
  }

  log.info("cron.match_index.complete", { processed: results.length });
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}

export const GET = withCronHealth("match-index", handle);
