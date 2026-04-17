import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { log } from "@/lib/logger";

/**
 * GET /api/cron/briefing
 *
 * Daily morning briefing — creates a notification and upserts the daily
 * snapshot for every connected user.
 *
 * Hardening:
 *   - CRON_SECRET bearer auth (fail-closed in production).
 *   - Pagination: processes users in pages of PAGE_SIZE so huge user bases
 *     don't blow the 300-second function budget.
 *   - Idempotency: skips users that already have today's snapshot + briefing
 *     notification, so manual re-runs don't spam users.
 *   - Bounded concurrency: WORKERS = 6 parallel per-user tasks at most.
 *   - Structured logging of every failure keyed by userId.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_SIZE = 500;
const WORKERS = 6;

interface UserRow {
  id: string;
  display_name: string | null;
  email: string | null;
  timezone: string | null;
}

export async function GET(req: Request): Promise<Response> {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const results: Array<{ userId: string; status: string }> = [];
  let totalProcessed = 0;
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id, display_name, email, timezone")
      .range(from, to)
      .order("id", { ascending: true });

    if (usersError) {
      log.error("cron.briefing.fetch_users_failed", usersError, { page });
      return NextResponse.json(
        { error: "Failed to fetch users", detail: usersError.message },
        { status: 500 }
      );
    }

    const batch = (users ?? []) as UserRow[];
    if (batch.length === 0) break;

    const queue = [...batch];
    const workers = Array.from({ length: Math.min(WORKERS, batch.length) }, async () => {
      for (;;) {
        const user = queue.pop();
        if (!user) return;
        const res = await processUser(user, today);
        results.push(res);
      }
    });
    await Promise.all(workers);

    totalProcessed += batch.length;
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  log.info("cron.briefing.complete", {
    processed: totalProcessed,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status.startsWith("error")).length,
  });

  return NextResponse.json({
    processed: totalProcessed,
    results,
    timestamp: new Date().toISOString(),
  });
}

async function processUser(
  user: UserRow,
  today: string
): Promise<{ userId: string; status: string }> {
  const supabase = getSupabaseAdmin();
  const userId = user.id;
  const dayStartIso = `${today}T00:00:00.000Z`;

  try {
    // ── Idempotency: if we already snapshotted today, skip.
    const { data: existingSnap } = await supabase
      .from("daily_snapshots")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (existingSnap) {
      return { userId, status: "skipped" };
    }

    // Secondary guard: if today's briefing notification already exists, skip.
    const { data: existingBriefing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "daily_briefing")
      .gte("created_at", dayStartIso)
      .maybeSingle();

    if (existingBriefing) {
      return { userId, status: "skipped" };
    }

    const displayName = user.display_name ?? "Analyst";
    const stats = await getPipelineStatsRest(userId, { useAdmin: true });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [recentAppsResult, recentEmailsResult, agentLogsResult, emailsProcessedResult] =
      await Promise.all([
        supabase
          .from("applications")
          .select("id, status, company_name, role, updated_at")
          .eq("user_id", userId)
          .gte("updated_at", yesterday)
          .order("updated_at", { ascending: false }),
        supabase
          .from("emails")
          .select("id, classification, subject, from_address")
          .eq("user_id", userId)
          .gte("received_at", yesterday)
          .order("received_at", { ascending: false }),
        supabase
          .from("agent_logs")
          .select("id")
          .eq("user_id", userId)
          .gte("created_at", dayStartIso),
        supabase
          .from("emails")
          .select("id")
          .eq("user_id", userId)
          .eq("is_processed", true)
          .gte("created_at", dayStartIso),
      ]);

    const recentApps = recentAppsResult.data ?? [];
    const recentEmails = recentEmailsResult.data ?? [];
    const agentLogsToday = agentLogsResult.data ?? [];
    const emailsToday = emailsProcessedResult.data ?? [];

    const newApps = recentApps.filter((a) => a.status === "discovered").length;
    const statusChanges = recentApps.filter((a) => a.status !== "discovered").length;
    const importantEmails = recentEmails.filter(
      (e) =>
        e.classification === "interview_invite" || e.classification === "offer"
    );

    const lines: string[] = [`Morning, ${displayName}.`];
    if (stats.total === 0) {
      lines.push("Pipeline is empty. Time to get to work.");
    } else {
      lines.push(`Pipeline: ${stats.total} active ops.`);
      if (newApps > 0) {
        lines.push(
          `${newApps} new application${newApps > 1 ? "s" : ""} added overnight.`
        );
      }
      if (statusChanges > 0) {
        lines.push(`${statusChanges} status change${statusChanges > 1 ? "s" : ""}.`);
      }
      if (stats.staleCount > 0) {
        lines.push(
          `⚠ ${stats.staleCount} stale op${stats.staleCount > 1 ? "s" : ""} need attention.`
        );
      }
      for (const email of importantEmails) {
        lines.push(
          `📬 ${email.classification === "interview_invite" ? "Interview invite" : "Offer"}: ${email.subject ?? "No subject"}`
        );
      }
      if (stats.appliedToScreeningRate > 0) {
        const rateLabel =
          stats.appliedToScreeningRate >= 20 ? "healthy" : "below average";
        lines.push(
          `Applied→Screen rate: ${stats.appliedToScreeningRate.toFixed(0)}% (${rateLabel}).`
        );
      }
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "daily_briefing",
        priority: stats.staleCount > 3 ? "high" : "medium",
        title: "Morning Briefing",
        body: lines.join(" "),
        source_agent: "ceo",
        channels: ["in_app"],
        is_read: false,
        is_dismissed: false,
      });
    if (notificationError) {
      throw new Error(`notification insert: ${notificationError.message}`);
    }

    const interviewingCount =
      (stats.byStatus["interview_scheduled"] ?? 0) +
      (stats.byStatus["interviewing"] ?? 0);

    const { error: snapshotError } = await supabase.from("daily_snapshots").upsert(
      {
        user_id: userId,
        date: today,
        total_applications:
          stats.total +
          (stats.byStatus["accepted"] ?? 0) +
          (stats.byStatus["rejected"] ?? 0) +
          (stats.byStatus["withdrawn"] ?? 0),
        active_pipeline: stats.total,
        interviews_scheduled: stats.scheduledInterviews,
        offers: stats.offers,
        rejections: stats.byStatus["rejected"] ?? 0,
        emails_processed: emailsToday.length,
        agents_runs: agentLogsToday.length,
        total_cost_cents: 0,
        conversion_rate: stats.conversionRate,
        stale_count: stats.staleCount,
        applied_count: stats.applied,
        screening_count: stats.screening,
        interview_count: interviewingCount,
        offer_count: stats.offers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );
    if (snapshotError) {
      throw new Error(`snapshot upsert: ${snapshotError.message}`);
    }

    return { userId, status: "success" };
  } catch (err) {
    log.error("cron.briefing.user_failed", err, { userId });
    const message = err instanceof Error ? err.message : "unknown";
    return { userId, status: `error: ${message}` };
  }
}
