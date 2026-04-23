import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import {
  shouldFireStaleCluster,
  shouldFireRejectionCluster,
  shouldFireOfferArrived,
  type MiniApp,
  type MiniNotification,
  type TriggerDecision,
} from "@/lib/ai/agents/unprompted-triggers";

/**
 * GET /api/cron/unprompted-ceo
 *
 * Fires every 6h (see vercel.json — `0 ∗/6 ∗ ∗ ∗`). Sweeps every active
 * user and lets the CEO drop unprompted notifications when the pipeline
 * crosses one of three thresholds:
 *
 *   - stale_cluster:    >5 early-pipeline apps idle 14+ days → high
 *   - rejection_cluster: >=3 rejections in the last 7 days → medium
 *   - offer_arrived:    each new offer within the last 24h → critical
 *
 * Threshold logic is pure and lives in `src/lib/ai/agents/unprompted-
 * triggers.ts` — this handler is a thin wrapper that does the I/O.
 *
 * "Active user" = user_profiles.deleted_at IS NULL AND last_floor_visited
 * not null AND updated_at within the last 30 days. We use updated_at as a
 * proxy for "touched the building recently" — last_floor_visited itself
 * is a text column with no timestamp of its own.
 *
 * Per-user error isolation: any throw inside the per-user block is caught
 * and logged; the sweep continues with the next user.
 *
 * Auth: `verifyCronRequest` enforces Bearer CRON_SECRET OR x-vercel-cron: 1.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACTIVE_WINDOW_DAYS = 30;

interface ActiveUser {
  id: string;
}

interface ApplicationRow {
  id: string;
  status: string;
  last_activity_at: string | null;
  updated_at: string;
  created_at: string;
  company_name: string | null;
  role: string;
}

interface NotificationRow {
  source_agent: string | null;
  source_entity_id: string | null;
  source_entity_type: string | null;
  created_at: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  const admin = getSupabaseAdmin();

  const activeCutoff = new Date(
    now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: users, error: usersErr } = await admin
    .from("user_profiles")
    .select("id")
    .is("deleted_at", null)
    .not("last_floor_visited", "is", null)
    .gt("updated_at", activeCutoff);

  if (usersErr) {
    log.error("unprompted_ceo.fetch_users_failed", usersErr);
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  const activeUsers = (users ?? []) as ActiveUser[];
  let usersSwept = 0;
  let notificationsCreated = 0;
  const failures: string[] = [];

  for (const user of activeUsers) {
    try {
      const decisions = await sweepUser(user.id, now);
      notificationsCreated += decisions;
      usersSwept++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn("unprompted_ceo.user_failed", { userId: user.id, error: msg });
      failures.push(user.id);
    }
  }

  log.info("unprompted_ceo.done", {
    usersSwept,
    notificationsCreated,
    failed: failures.length,
  });

  return NextResponse.json({
    ok: true,
    usersSwept,
    notificationsCreated,
    failed: failures,
  });
}

/**
 * Sweep a single user. Returns the number of notifications inserted.
 * Throws on any non-recoverable error — the caller isolates failures.
 */
async function sweepUser(userId: string, now: Date): Promise<number> {
  const admin = getSupabaseAdmin();

  const { data: apps, error: appsErr } = await admin
    .from("applications")
    .select(
      "id, status, last_activity_at, updated_at, created_at, company_name, role",
    )
    .eq("user_id", userId);

  if (appsErr) throw new Error(`applications: ${appsErr.message}`);

  const recentNotifCutoff = new Date(
    now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: notifs, error: notifsErr } = await admin
    .from("notifications")
    .select("source_agent, source_entity_id, source_entity_type, created_at")
    .eq("user_id", userId)
    .eq("source_agent", "ceo")
    .gt("created_at", recentNotifCutoff);

  if (notifsErr) throw new Error(`notifications: ${notifsErr.message}`);

  const miniApps: MiniApp[] = (apps ?? []) as ApplicationRow[];
  const miniNotifs: MiniNotification[] = (notifs ?? []) as NotificationRow[];

  const decisions: TriggerDecision[] = [];

  const stale = shouldFireStaleCluster(miniApps, now);
  if (stale) decisions.push(stale);

  const rejections = shouldFireRejectionCluster(miniApps, now);
  if (rejections) decisions.push(rejections);

  const offers = shouldFireOfferArrived(miniApps, miniNotifs, now);
  decisions.push(...offers);

  if (decisions.length === 0) return 0;

  let inserted = 0;
  for (const d of decisions) {
    const { error: insertErr } = await admin.from("notifications").insert({
      user_id: userId,
      type: d.type,
      priority: d.priority,
      title: d.title,
      body: d.body,
      source_agent: "ceo",
      source_entity_id: d.sourceEntityId,
      source_entity_type: d.sourceEntityType,
      actions: d.actions,
      is_read: false,
      is_dismissed: false,
    });
    if (insertErr) {
      // One notification failing shouldn't poison the rest of the user's
      // sweep — log it and keep going. The sweep as a whole still counts
      // as success.
      log.warn("unprompted_ceo.insert_failed", {
        userId,
        type: d.type,
        error: insertErr.message,
      });
      continue;
    }
    inserted++;
  }

  return inserted;
}
