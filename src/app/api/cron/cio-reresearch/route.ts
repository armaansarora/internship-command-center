import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/db/queries/notifications-rest";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/cio-reresearch
 *
 * Runs daily at 05:00 UTC.  Finds companies whose `research_freshness` is
 * older than 30 days (or null — never researched) AND are attached to an
 * active application. For each such company — capped at 3 per user per
 * run — touches `research_freshness = now()` and fires one CIO tube
 * notification ("I refreshed the dossier").
 *
 * Idempotency:  `source_entity_id = cio-reresearch-<companyId>-YYYY-MM-DD`.
 * Re-running in the same day finds the existing notification row and
 * inserts nothing.
 *
 * Note: this cron updates the freshness timestamp and fires a
 * notification; the actual LLM-driven re-research happens in
 * `src/lib/ai/research/…` and is invoked lazily when the user opens the
 * dossier (so the cron stays fast and the AI call only runs when the
 * refreshed dossier is about to be read).
 */
export const maxDuration = 300;

const STALE_DAYS = 30;
const PER_USER_CAP = 3;

const ACTIVE_APP_STATUSES = [
  "applied",
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
];

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Active applications — gives us the set of companyIds worth refreshing.
  const { data: apps, error: appsErr } = await admin
    .from("applications")
    .select("user_id, company_id, status")
    .in("status", ACTIVE_APP_STATUSES)
    .not("company_id", "is", null);

  if (appsErr) {
    log.error("cio_reresearch.read_apps_failed", appsErr, {
      error: appsErr.message,
    });
    return NextResponse.json(
      { error: `read apps failed: ${appsErr.message}` },
      { status: 500 },
    );
  }

  const activeCompanyIds = new Set<string>();
  for (const a of apps ?? []) {
    if (a.company_id) activeCompanyIds.add(a.company_id as string);
  }
  if (activeCompanyIds.size === 0) {
    return NextResponse.json({ ok: true, refreshed: 0 });
  }

  // 2. Stale companies inside that active set.
  const { data: stale, error: staleErr } = await admin
    .from("companies")
    .select("id, user_id, name, research_freshness")
    .in("id", Array.from(activeCompanyIds))
    .or(`research_freshness.lt.${cutoffIso},research_freshness.is.null`)
    .limit(300);

  if (staleErr) {
    log.error("cio_reresearch.read_stale_failed", staleErr, {
      error: staleErr.message,
    });
    return NextResponse.json(
      { error: `read stale failed: ${staleErr.message}` },
      { status: 500 },
    );
  }

  // 3. Cap per user.
  const byUser = new Map<string, Array<{ id: string; name: string }>>();
  for (const co of stale ?? []) {
    const key = co.user_id as string;
    const arr = byUser.get(key) ?? [];
    if (arr.length < PER_USER_CAP) {
      arr.push({ id: co.id as string, name: (co.name as string) ?? "Unknown" });
      byUser.set(key, arr);
    }
  }

  let refreshed = 0;

  for (const [userId, companies] of byUser) {
    for (const co of companies) {
      const upd = await admin
        .from("companies")
        .update({ research_freshness: new Date().toISOString() })
        .eq("id", co.id);

      if (upd.error) {
        log.warn("cio_reresearch.update_failed", {
          companyId: co.id,
          error: upd.error.message,
        });
        continue;
      }
      refreshed += 1;

      await createNotification({
        userId,
        type: "dossier-refresh",
        priority: "low",
        title: "CIO: I refreshed a dossier",
        body:
          `I refreshed the ${co.name} dossier — the last look was over a month ago.`,
        sourceAgent: "cio",
        sourceEntityId: `cio-reresearch-${co.id}-${today}`,
        sourceEntityType: "company",
        channels: ["pneumatic_tube"],
      });
    }
  }

  return NextResponse.json({ ok: true, refreshed });
}

export const GET = withCronHealth("cio-reresearch", handle);
