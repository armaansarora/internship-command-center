import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/db/queries/notifications-rest";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/cfo-threshold
 *
 * Mondays at 09:00 UTC (vercel.json). For every user with ≥10 active-pipeline
 * applications in the trailing 8-week window:
 *
 *   1. Compute conversion rate for the previous 7 days vs the 7 days before.
 *      conversionRate = stages-after-applied / non-discovered-total
 *      where stages-after-applied ∈
 *        {screening, interview_scheduled, interviewing, under_review,
 *         offer, accepted}.
 *      Discovered apps haven't been actively pursued, so they don't enter
 *      either side of the ratio.
 *   2. If conversion fell more than 5 percentage points week-over-week,
 *      compose a deterministic CFO note (real numbers, not boilerplate)
 *      and fire ONE pneumatic-tube notification through the R7 tube.
 *
 * Reuses R7 delivery — `channels: ['pneumatic_tube']` IS the contract.
 * Quiet-hours queueing happens server-side inside `createNotification`.
 *
 * Idempotency: `source_entity_id = cfo-threshold-<userId>-w<weekBucket>`,
 * so repeated runs inside the same week collapse to one notification row.
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1).
 */
export const maxDuration = 300;

const PAGE_SIZE = 1000;
const MIN_APPS_8W = 10;
const DROP_THRESHOLD = 0.05; // 5 percentage-point fall WoW
const DAY_MS = 86_400_000;

// Stages that count as "advanced past applied" — the numerator of the
// conversion ratio. Mirrors the war-table's pipeline stages.
const ADVANCED_STATUSES = new Set([
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
  "offer",
  "accepted",
]);

// Stages that enter the denominator. Discovered + withdrawn don't count
// (one was never pursued, the other was actively retracted by the user).
const DENOMINATOR_STATUSES = new Set([
  "applied",
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
  "offer",
  "accepted",
  "rejected",
]);

interface AppRow {
  user_id: string;
  status: string;
  created_at: string;
}

interface UserBucket {
  thisWeek: { advanced: number; total: number };
  prevWeek: { advanced: number; total: number };
  total8w: number;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date();

  // Window boundaries.
  const eightWeeksAgo = new Date(now.getTime() - 56 * DAY_MS);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

  // Page through every application created in the trailing 8 weeks.
  // 8 weeks is the brief minimum for the volume floor; it's also a tight
  // enough window that page count stays bounded for a healthy product.
  const buckets = new Map<string, UserBucket>();
  let scanned = 0;
  let fromOffset = 0;

  for (;;) {
    const { data: page, error } = await admin
      .from("applications")
      .select("user_id, status, created_at")
      .gte("created_at", eightWeeksAgo.toISOString())
      .range(fromOffset, fromOffset + PAGE_SIZE - 1);

    if (error) {
      log.error("cfo_threshold.read_failed", error, { error: error.message });
      return NextResponse.json(
        { error: `read applications failed: ${error.message}` },
        { status: 500 },
      );
    }
    if (!page || page.length === 0) break;

    for (const raw of page) {
      const row = raw as unknown as AppRow;
      const status = row.status;
      const userId = row.user_id;
      if (!userId || !status) continue;

      let bucket = buckets.get(userId);
      if (!bucket) {
        bucket = {
          thisWeek: { advanced: 0, total: 0 },
          prevWeek: { advanced: 0, total: 0 },
          total8w: 0,
        };
        buckets.set(userId, bucket);
      }

      bucket.total8w += 1;

      const created = new Date(row.created_at);
      const inThisWeek = created >= sevenDaysAgo;
      const inPrevWeek = !inThisWeek && created >= fourteenDaysAgo;

      if (!inThisWeek && !inPrevWeek) continue;
      if (!DENOMINATOR_STATUSES.has(status)) continue;

      const slot = inThisWeek ? bucket.thisWeek : bucket.prevWeek;
      slot.total += 1;
      if (ADVANCED_STATUSES.has(status)) slot.advanced += 1;
    }

    scanned += page.length;
    if (page.length < PAGE_SIZE) break;
    fromOffset += PAGE_SIZE;
  }

  // Same week-bucket maths as warmth-decay so re-runs inside the same
  // week resolve to the same source_entity_id.
  const weekBucket = Math.floor(now.getTime() / (7 * DAY_MS));
  let notified = 0;

  for (const [userId, bucket] of buckets) {
    if (bucket.total8w < MIN_APPS_8W) continue;
    if (bucket.thisWeek.total === 0 || bucket.prevWeek.total === 0) continue;

    const curRate = bucket.thisWeek.advanced / bucket.thisWeek.total;
    const prevRate = bucket.prevWeek.advanced / bucket.prevWeek.total;
    const drop = prevRate - curRate;
    if (drop <= DROP_THRESHOLD) continue;

    const prevPct = Math.round(prevRate * 100);
    const curPct = Math.round(curRate * 100);
    const body =
      `Conversion fell from ${prevPct}% to ${curPct}% week-over-week. ` +
      "Worth a closer look at where applications are stalling.";

    try {
      await createNotification({
        userId,
        type: "cfo-threshold",
        priority: "low",
        title: "CFO has a note on the week",
        body,
        sourceAgent: "cfo",
        sourceEntityId: `cfo-threshold-${userId}-w${weekBucket}`,
        sourceEntityType: "analytics",
        channels: ["pneumatic_tube"],
      });
      notified += 1;
    } catch (err) {
      log.warn("cfo_threshold.notify_failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, scanned, notified });
}

export const GET = withCronHealth("cfo-threshold", handle);
