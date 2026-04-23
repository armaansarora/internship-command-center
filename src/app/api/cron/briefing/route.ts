import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { log } from "@/lib/logger";
import {
  generateMorningBriefing,
  type MorningBriefingInput,
} from "@/lib/ai/agents/morning-briefing";
import { encodeBriefing } from "@/lib/penthouse/briefing-storage";
import { synthesizeFallbackBriefing } from "@/lib/penthouse/briefing-fallback";

/**
 * GET /api/cron/briefing
 *
 * Daily morning briefing — creates a notification and upserts the daily
 * snapshot for every connected user.
 *
 * Hardening:
 *   - CRON_SECRET bearer auth (fail-closed in production). See `verifyCronRequest`
 *     in `src/lib/auth/cron.ts` — rejects requests in prod when the secret
 *     is missing (audit C-1: fail-open cron → AI-cost DoS).
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
    const rejectionsOvernight = recentApps.filter((a) => a.status === "rejected").length;
    const importantEmails = recentEmails.filter(
      (e) =>
        e.classification === "interview_invite" || e.classification === "offer"
    );

    // ── Build the structured briefing. Tries the CEO agent first; falls back
    //    to a deterministic synth if the agent call fails. Either way we end
    //    up with a schema-valid MorningBriefing that we JSON-prefix into
    //    notifications.body (see `briefing-storage`). The Penthouse scene
    //    decodes the prefix on render; legacy consumers just see a longer
    //    text body.
    const briefingInput: MorningBriefingInput = {
      userId,
      displayName,
      pipeline: {
        total: stats.total,
        applied: stats.applied,
        screening: stats.screening,
        interviews:
          (stats.byStatus["interview_scheduled"] ?? 0) +
          (stats.byStatus["interviewing"] ?? 0),
        offers: stats.offers,
        staleCount: stats.staleCount,
        appliedToScreeningRate: stats.appliedToScreeningRate,
      },
      overnight: {
        newApps,
        statusChanges,
        importantEmails: importantEmails.map((e) => ({
          kind:
            e.classification === "interview_invite"
              ? ("interview_invite" as const)
              : ("offer" as const),
          subject: e.subject ?? "No subject",
        })),
        rejections: rejectionsOvernight,
      },
    };
    const generated = await generateMorningBriefing(briefingInput);
    const briefing = generated ?? synthesizeFallbackBriefing(briefingInput);
    const body = encodeBriefing(briefing);

    const priority: "critical" | "high" | "medium" | "low" =
      briefing.beats.some((b) => b.data_cue === "offer") ||
      briefing.beats.some((b) => b.data_cue === "interview_invite") ||
      stats.staleCount > 3
        ? "high"
        : "medium";

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "daily_briefing",
        priority,
        title: "Morning Briefing",
        body,
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
