import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";

/**
 * GET /api/cron/briefing
 * 
 * Daily briefing cron job. Runs for all users with active accounts.
 * Compiles overnight activity, creates a notification for each user,
 * and snapshots the daily pipeline state.
 * 
 * Protected by CRON_SECRET header (set in Vercel).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request): Promise<Response> {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Get all users with profiles
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("id, display_name, email, timezone");

  if (usersError || !users) {
    return NextResponse.json(
      { error: "Failed to fetch users", detail: usersError?.message },
      { status: 500 },
    );
  }

  const results: Array<{ userId: string; status: string }> = [];

  for (const user of users) {
    try {
      const userId = user.id as string;
      const displayName = (user.display_name as string) ?? "Analyst";

      // Get pipeline stats
      const stats = await getPipelineStatsRest(userId, { useAdmin: true });

      // Get overnight activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentApps } = await supabase
        .from("applications")
        .select("id, status, company_name, role, updated_at")
        .eq("user_id", userId)
        .gte("updated_at", yesterday)
        .order("updated_at", { ascending: false });

      const { data: recentEmails } = await supabase
        .from("emails")
        .select("id, classification, subject, from_address")
        .eq("user_id", userId)
        .gte("received_at", yesterday)
        .order("received_at", { ascending: false });

      // Build briefing summary
      const newApps = (recentApps ?? []).filter((a) => a.status === "discovered").length;
      const statusChanges = (recentApps ?? []).filter((a) => a.status !== "discovered").length;
      const importantEmails = (recentEmails ?? []).filter(
        (e) => e.classification === "interview_invite" || e.classification === "offer",
      );

      // Compose the briefing notification
      const lines: string[] = [];
      lines.push(`Morning, ${displayName}.`);
      
      if (stats.total === 0) {
        lines.push("Pipeline is empty. Time to get to work.");
      } else {
        lines.push(`Pipeline: ${stats.total} active ops.`);
        
        if (newApps > 0) lines.push(`${newApps} new application${newApps > 1 ? "s" : ""} added overnight.`);
        if (statusChanges > 0) lines.push(`${statusChanges} status change${statusChanges > 1 ? "s" : ""}.`);
        if (stats.staleCount > 0) lines.push(`⚠ ${stats.staleCount} stale op${stats.staleCount > 1 ? "s" : ""} need attention.`);
        if (importantEmails.length > 0) {
          for (const email of importantEmails) {
            lines.push(`📬 ${email.classification === "interview_invite" ? "Interview invite" : "Offer"}: ${email.subject ?? "No subject"}`);
          }
        }

        // Conversion rate health
        if (stats.appliedToScreeningRate > 0) {
          const rateLabel = stats.appliedToScreeningRate >= 20 ? "healthy" : "below average";
          lines.push(`Applied→Screen rate: ${stats.appliedToScreeningRate.toFixed(0)}% (${rateLabel}).`);
        }
      }

      // Create notification
      const { error: notificationError } = await supabase.from("notifications").insert({
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
        throw new Error(`Failed to create notification: ${notificationError.message}`);
      }

      // Snapshot today's stats
      const today = new Date().toISOString().split("T")[0];
      
      const { data: agentLogsToday } = await supabase
        .from("agent_logs")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00.000Z`);

      const { data: emailsToday } = await supabase
        .from("emails")
        .select("id")
        .eq("user_id", userId)
        .eq("is_processed", true)
        .gte("created_at", `${today}T00:00:00.000Z`);

      const interviewingCount =
        (stats.byStatus["interview_scheduled"] ?? 0) +
        (stats.byStatus["interviewing"] ?? 0);

      const { error: snapshotError } = await supabase.from("daily_snapshots").upsert(
        {
          user_id: userId,
          date: today,
          total_applications: stats.total + (stats.byStatus["accepted"] ?? 0) + (stats.byStatus["rejected"] ?? 0) + (stats.byStatus["withdrawn"] ?? 0),
          active_pipeline: stats.total,
          interviews_scheduled: stats.scheduledInterviews,
          offers: stats.offers,
          rejections: stats.byStatus["rejected"] ?? 0,
          emails_processed: (emailsToday ?? []).length,
          agents_runs: (agentLogsToday ?? []).length,
          total_cost_cents: 0,
          conversion_rate: stats.conversionRate,
          stale_count: stats.staleCount,
          applied_count: stats.applied,
          screening_count: stats.screening,
          interview_count: interviewingCount,
          offer_count: stats.offers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      );
      if (snapshotError) {
        throw new Error(`Failed to upsert daily snapshot: ${snapshotError.message}`);
      }

      results.push({ userId, status: "success" });
    } catch (err) {
      results.push({
        userId: user.id as string,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
