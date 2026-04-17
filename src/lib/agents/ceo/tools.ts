import { tool } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";

// ---------------------------------------------------------------------------
// Tool 1: dispatchAgent — DEPRECATED
// ---------------------------------------------------------------------------
//
// The old `dispatchAgent` tool returned a hardcoded acknowledgment string
// without actually invoking any subagent. Real dispatch is now wired in
// `src/lib/ai/agents/ceo-orchestrator.ts` as seven typed tools
// (`dispatchToCRO`, `dispatchToCOO`, etc.) that the CEO route handler
// injects via `createAgentRouteHandler`'s `buildExtraTools` hook. Each
// dispatch tool runs a nested `generateText` against the target agent's
// persona + tools and returns a compressed structured payload.
//
// We deliberately do NOT export a dispatchAgent tool here anymore — keeping
// the placeholder would let the CEO model call it instead of the real
// orchestrator tools and break the chain of command. Removed.

// ---------------------------------------------------------------------------
// Tool 2: compileBriefing
// ---------------------------------------------------------------------------
export function makeCompileBriefingTool(userId: string) {
  return tool({
    description:
      "Aggregate results from multiple department agents into a unified executive summary. Calls the full pipeline, recent activity, and department logs to build the complete picture.",
    inputSchema: z.object({
      focusArea: z
        .enum(["full", "pipeline", "network", "schedule", "brand"])
        .default("full")
        .describe("Which domain to emphasize in the compiled briefing"),
      window: z
        .enum(["today", "week", "month"])
        .default("week")
        .describe("Time window for the briefing"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      // Fetch pipeline stats
      const stats = await getPipelineStatsRest(userId);

      // Fetch recent agent logs
      const { data: logs } = await supabase
        .from("agent_logs")
        .select("agent, action, output_summary, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch notifications count
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      const windowLabel =
        input.window === "today"
          ? "Today"
          : input.window === "week"
            ? "This week"
            : "This month";

      return {
        focusArea: input.focusArea,
        window: windowLabel,
        pipeline: {
          total: stats.total,
          weeklyActivity: stats.weeklyActivity,
          staleCount: stats.staleCount,
          appliedToScreeningRate: stats.appliedToScreeningRate,
          screeningToInterviewRate: stats.screeningToInterviewRate,
          interviewToOfferRate: stats.interviewToOfferRate,
          offers: stats.offers,
          scheduledInterviews: stats.scheduledInterviews,
        },
        recentAgentActivity: (logs ?? []).slice(0, 5).map((l) => ({
          agent: l.agent as string,
          action: l.action as string,
          summary: l.output_summary as string,
          at: l.created_at as string,
        })),
        unreadNotifications: notifCount ?? 0,
        timestamp: new Date().toISOString(),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: queryAllPipeline
// ---------------------------------------------------------------------------
export function makeQueryAllPipelineTool(userId: string) {
  return tool({
    description:
      "Read the full pipeline statistics across all departments and stages. Returns counts by status, conversion rates, velocity, and health indicators. Always call this before making pipeline claims.",
    inputSchema: z.object({
      includeArchived: z
        .boolean()
        .default(false)
        .describe("When true, include rejected/withdrawn applications in counts"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      let query = supabase
        .from("applications")
        .select("status, last_activity_at, created_at, applied_at, company_name, role, tier")
        .eq("user_id", userId);

      if (!input.includeArchived) {
        query = query.not("status", "in", '("rejected","withdrawn")');
      }

      const { data, error } = await query;

      if (error || !data) {
        return {
          error: "Failed to query pipeline",
          total: 0,
          byStatus: {},
          tiers: {},
        };
      }

      const byStatus: Record<string, number> = {};
      const tiers: Record<string, number> = { tier1: 0, tier2: 0, tier3: 0, untiered: 0 };
      let staleCount = 0;
      let warmCount = 0;
      const now = new Date();

      for (const row of data) {
        const s = (row.status as string) ?? "discovered";
        byStatus[s] = (byStatus[s] ?? 0) + 1;

        const tier = row.tier as number | null;
        if (tier === 1) tiers.tier1++;
        else if (tier === 2) tiers.tier2++;
        else if (tier === 3) tiers.tier3++;
        else tiers.untiered++;

        const last = (row.last_activity_at as string | null) ?? (row.created_at as string);
        const diffDays = Math.floor(
          (now.getTime() - new Date(last).getTime()) / (24 * 60 * 60 * 1000)
        );
        if (diffDays >= 14) staleCount++;
        else if (diffDays >= 7) warmCount++;
      }

      return {
        total: data.length,
        byStatus,
        tiers,
        staleCount,
        warmCount,
        includeArchived: input.includeArchived,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: getRecentActivity
// ---------------------------------------------------------------------------
export function makeGetRecentActivityTool(userId: string) {
  return tool({
    description:
      "Read recent agent logs and notifications to surface overnight or recent activity. Use this to understand what happened while the user was away.",
    inputSchema: z.object({
      hoursBack: z
        .number()
        .int()
        .min(1)
        .max(168)
        .default(24)
        .describe("How many hours back to look for activity (1–168, default: 24)"),
      includeNotifications: z
        .boolean()
        .default(true)
        .describe("When true, include unread notifications in the response"),
    }),
    execute: async (input) => {
      const supabase = await createClient();
      const since = new Date(
        Date.now() - input.hoursBack * 60 * 60 * 1000
      ).toISOString();

      // Agent logs
      const { data: logs } = await supabase
        .from("agent_logs")
        .select("agent, action, output_summary, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      // Notifications
      let notifications: Array<{
        id: string;
        title: string;
        priority: string;
        isRead: boolean;
        createdAt: string;
      }> = [];

      if (input.includeNotifications) {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("id, title, priority, is_read, created_at")
          .eq("user_id", userId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(10);

        notifications = (notifs ?? []).map((n) => ({
          id: n.id as string,
          title: n.title as string,
          priority: n.priority as string,
          isRead: n.is_read as boolean,
          createdAt: n.created_at as string,
        }));
      }

      const activityLogs = (logs ?? []).map((l) => ({
        agent: l.agent as string,
        action: l.action as string,
        summary: l.output_summary as string,
        at: l.created_at as string,
      }));

      const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

      return {
        hoursBack: input.hoursBack,
        agentActivity: activityLogs,
        activityCount: activityLogs.length,
        notifications,
        unreadNotifications: unreadNotifCount,
        since,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: getDailyBriefingData
// ---------------------------------------------------------------------------
export function makeGetDailyBriefingDataTool(userId: string) {
  return tool({
    description:
      "Compile the full overnight activity report for the morning briefing. Combines pipeline changes, agent actions, notifications, and calendar events since last session.",
    inputSchema: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Run all queries in parallel
      const [
        statsResult,
        logsResult,
        notifsResult,
        interviewsResult,
        applicationsResult,
      ] = await Promise.all([
        getPipelineStatsRest(userId),
        supabase
          .from("agent_logs")
          .select("agent, action, output_summary, created_at")
          .eq("user_id", userId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("notifications")
          .select("id, title, priority, is_read, created_at")
          .eq("user_id", userId)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("interviews")
          .select(
            "id, scheduled_at, format, round, company_name:applications!inner(company_name), role:applications!inner(role)"
          )
          .eq("user_id", userId)
          .gte(
            "scheduled_at",
            new Date().toISOString().split("T")[0] + "T00:00:00Z"
          )
          .lte(
            "scheduled_at",
            new Date().toISOString().split("T")[0] + "T23:59:59Z"
          ),
        supabase
          .from("applications")
          .select("status, last_activity_at, created_at")
          .eq("user_id", userId)
          .gte("last_activity_at", since),
      ]);

      const recentChanges = (applicationsResult.data ?? []).length;
      const unreadNotifs = (notifsResult.data ?? []).length;
      const agentLogs = (logsResult.data ?? []).map((l) => ({
        agent: l.agent as string,
        action: l.action as string,
        summary: l.output_summary as string,
      }));

      const todaysInterviews = (interviewsResult.data ?? []).length;

      return {
        headline: `${recentChanges} pipeline changes overnight. ${unreadNotifs} unread notifications. ${todaysInterviews} interview${todaysInterviews !== 1 ? "s" : ""} today.`,
        pipeline: {
          total: statsResult.total,
          staleCount: statsResult.staleCount,
          warmCount: statsResult.warmCount,
          weeklyActivity: statsResult.weeklyActivity,
          appliedToScreeningRate: statsResult.appliedToScreeningRate,
          offers: statsResult.offers,
        },
        overnightChanges: recentChanges,
        unreadNotifications: unreadNotifs,
        topNotifications: (notifsResult.data ?? []).map((n) => ({
          title: n.title as string,
          priority: n.priority as string,
        })),
        agentActivity: agentLogs,
        todaysInterviews,
        generatedAt: new Date().toISOString(),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCEOTools(userId: string) {
  return {
    // dispatchAgent intentionally absent — see deprecation note above. Real
    // dispatch lives in `ceo-orchestrator.ts` and is mixed in by the route.
    compileBriefing: makeCompileBriefingTool(userId),
    queryAllPipeline: makeQueryAllPipelineTool(userId),
    getRecentActivity: makeGetRecentActivityTool(userId),
    getDailyBriefingData: makeGetDailyBriefingDataTool(userId),
  };
}
