import { tool } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

// Industry benchmarks for comparison
const BENCHMARKS = {
  appliedToScreening: { avg: 20, topQuartile: 28 },
  screeningToInterview: { avg: 25, topQuartile: 35 },
  interviewToOffer: { avg: 15, topQuartile: 22 },
  responseRate: { avg: 18, topQuartile: 30 },
  pipelineVelocityDays: { avg: 7, topQuartile: 4 },
} as const;

// ---------------------------------------------------------------------------
// Tool 1: getConversionFunnel
// ---------------------------------------------------------------------------
export function makeGetConversionFunnelTool(userId: string) {
  return tool({
    description:
      "Get the full pipeline conversion funnel with stage-to-stage rates and industry benchmark comparisons. Always call this before making conversion rate claims.",
    inputSchema: z.object({
      fromDate: z
        .string()
        .optional()
        .describe("ISO date string — start of the analysis window (default: 90 days ago)"),
      toDate: z
        .string()
        .optional()
        .describe("ISO date string — end of the analysis window (default: now)"),
    }),
    execute: async (input) => {
      const supabase = await createClient();
      const now = new Date();
      const from = input.fromDate
        ? new Date(input.fromDate)
        : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const to = input.toDate ? new Date(input.toDate) : now;

      const { data, error } = await supabase
        .from("applications")
        .select("status, created_at")
        .eq("user_id", userId)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());

      if (error || !data || data.length === 0) {
        return {
          window: { from: from.toISOString(), to: to.toISOString() },
          funnel: [],
          totalAnalyzed: 0,
          insight: "No applications found in this window.",
        };
      }

      const byStatus: Record<string, number> = {};
      for (const row of data) {
        const s = (row.status as string) ?? "discovered";
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }

      const discovered = byStatus["discovered"] ?? 0;
      const applied = byStatus["applied"] ?? 0;
      const screening = byStatus["screening"] ?? 0;
      const interviewScheduled = byStatus["interview_scheduled"] ?? 0;
      const interviewing = byStatus["interviewing"] ?? 0;
      const underReview = byStatus["under_review"] ?? 0;
      const offer = byStatus["offer"] ?? 0;
      const accepted = byStatus["accepted"] ?? 0;
      const rejected = byStatus["rejected"] ?? 0;
      const withdrawn = byStatus["withdrawn"] ?? 0;

      const interviewTotal = interviewScheduled + interviewing;

      const appliedToScreeningRate = applied > 0 ? (screening / applied) * 100 : 0;
      const screeningToInterviewRate = screening > 0 ? (interviewTotal / screening) * 100 : 0;
      const interviewToOfferRate = interviewTotal > 0 ? (offer / interviewTotal) * 100 : 0;
      const offerToAcceptedRate = offer > 0 ? (accepted / offer) * 100 : 0;

      const funnel = [
        {
          stage: "Discovered",
          count: discovered,
          conversionToNext: null,
          benchmark: null,
        },
        {
          stage: "Applied",
          count: applied,
          conversionToNext: appliedToScreeningRate,
          benchmark: BENCHMARKS.appliedToScreening,
          delta: appliedToScreeningRate - BENCHMARKS.appliedToScreening.avg,
        },
        {
          stage: "Screening",
          count: screening,
          conversionToNext: screeningToInterviewRate,
          benchmark: BENCHMARKS.screeningToInterview,
          delta: screeningToInterviewRate - BENCHMARKS.screeningToInterview.avg,
        },
        {
          stage: "Interviewing",
          count: interviewTotal,
          conversionToNext: interviewToOfferRate,
          benchmark: BENCHMARKS.interviewToOffer,
          delta: interviewToOfferRate - BENCHMARKS.interviewToOffer.avg,
        },
        {
          stage: "Under Review",
          count: underReview,
          conversionToNext: null,
          benchmark: null,
        },
        {
          stage: "Offer",
          count: offer,
          conversionToNext: offerToAcceptedRate,
          benchmark: null,
          delta: null,
        },
        {
          stage: "Accepted",
          count: accepted,
          conversionToNext: null,
          benchmark: null,
        },
      ];

      // Identify the bottleneck — largest negative delta
      const bottleneck = funnel
        .filter((s) => s.delta !== null && s.delta !== undefined)
        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0];

      const insight =
        bottleneck && bottleneck.delta !== null && bottleneck.delta !== undefined && bottleneck.delta < -3
          ? `Bottleneck detected at ${bottleneck.stage} stage: ${(bottleneck.conversionToNext ?? 0).toFixed(1)}% conversion vs ${bottleneck.benchmark?.avg}% average (${bottleneck.delta.toFixed(1)}pp gap).`
          : "Funnel conversion is within normal range. Focus on top-of-funnel volume.";

      return {
        window: { from: from.toISOString(), to: to.toISOString() },
        funnel,
        rejected,
        withdrawn,
        totalAnalyzed: data.length,
        insight,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: getPipelineVelocity
// ---------------------------------------------------------------------------
export function makeGetPipelineVelocityTool(userId: string) {
  return tool({
    description:
      "Calculate average days per pipeline stage — how long applications spend at each stage. Lower is better. Compare against top-performer benchmarks.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(10)
        .max(200)
        .default(50)
        .describe("Number of recent applications to analyze for velocity"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("applications")
        .select("status, created_at, applied_at, last_activity_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(input.limit);

      if (error || !data) {
        return { error: "Failed to fetch applications", velocity: null };
      }

      const now = new Date();
      const stageDurations: Record<string, number[]> = {
        applied: [],
        screening: [],
        interviewing: [],
        offer: [],
        active: [],
      };

      for (const row of data) {
        const status = (row.status as string) ?? "discovered";
        const createdAt = new Date(row.created_at as string);
        const lastActivity = row.last_activity_at
          ? new Date(row.last_activity_at as string)
          : now;
        const appliedAt = row.applied_at ? new Date(row.applied_at as string) : createdAt;

        const daysTotal = Math.floor(
          (lastActivity.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        const daysActive = Math.floor(
          (now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Stage-specific velocity
        if (
          ["applied", "screening", "interview_scheduled", "interviewing"].includes(status)
        ) {
          stageDurations.active.push(daysActive);
        }

        if (status === "applied") {
          const daysApplied = Math.floor(
            (now.getTime() - appliedAt.getTime()) / (24 * 60 * 60 * 1000)
          );
          stageDurations.applied.push(daysApplied);
        }

        if (daysTotal > 0) {
          if (status === "screening") stageDurations.screening.push(daysTotal);
          else if (["interview_scheduled", "interviewing"].includes(status))
            stageDurations.interviewing.push(daysTotal);
          else if (status === "offer") stageDurations.offer.push(daysTotal);
        }
      }

      const avg = (arr: number[]): number | null => {
        if (arr.length === 0) return null;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
      };

      const velocityReport = {
        avgDaysInApplied: avg(stageDurations.applied),
        avgDaysInScreening: avg(stageDurations.screening),
        avgDaysInInterviewing: avg(stageDurations.interviewing),
        avgDaysInOffer: avg(stageDurations.offer),
        avgDaysActiveInPipeline: avg(stageDurations.active),
        benchmarks: {
          appliedToScreeningAvgDays: BENCHMARKS.pipelineVelocityDays.avg,
          topQuartileAvgDays: BENCHMARKS.pipelineVelocityDays.topQuartile,
        },
        analyzed: data.length,
        insight:
          (avg(stageDurations.applied) ?? 0) > 14
            ? "Applications are sitting too long in 'applied' stage. Increase follow-up cadence."
            : "Stage velocity is within acceptable range.",
      };

      return velocityReport;
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: getWeeklyTrend
// ---------------------------------------------------------------------------
export function makeGetWeeklyTrendTool(userId: string) {
  return tool({
    description:
      "Compute week-over-week application activity trend. Shows new applications, stage progressions, and WoW direction for each metric.",
    inputSchema: z.object({
      weeksBack: z
        .number()
        .int()
        .min(1)
        .max(8)
        .default(4)
        .describe("Number of weeks to look back for trend analysis (1–8)"),
    }),
    execute: async (input) => {
      const supabase = await createClient();
      const now = new Date();
      const weeks: Array<{
        label: string;
        start: string;
        end: string;
        newApplications: number;
        stageProgressions: number;
      }> = [];

      for (let i = input.weeksBack - 1; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        const { data: newApps } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", userId)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString());

        const { data: progressions } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", userId)
          .gte("last_activity_at", weekStart.toISOString())
          .lte("last_activity_at", weekEnd.toISOString())
          .not("status", "in", '("discovered","applied")');

        weeks.push({
          label: `Week of ${weekStart.toISOString().split("T")[0]}`,
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          newApplications: (newApps ?? []).length,
          stageProgressions: (progressions ?? []).length,
        });
      }

      // Compute WoW deltas
      const withDeltas = weeks.map((week, idx) => {
        if (idx === 0) return { ...week, newApplicationsDelta: null, stageProgressionsDelta: null };
        const prev = weeks[idx - 1];
        return {
          ...week,
          newApplicationsDelta: week.newApplications - prev.newApplications,
          stageProgressionsDelta: week.stageProgressions - prev.stageProgressions,
        };
      });

      const latest = withDeltas[withDeltas.length - 1];
      const totalNewApps = weeks.reduce((sum, w) => sum + w.newApplications, 0);
      const avgNewAppsPerWeek = totalNewApps / weeks.length;

      return {
        weeks: withDeltas,
        summary: {
          totalNewApplications: totalNewApps,
          avgNewApplicationsPerWeek: Math.round(avgNewAppsPerWeek * 10) / 10,
          latestWeekNewApps: latest?.newApplications ?? 0,
          latestWeekDelta: latest?.newApplicationsDelta ?? null,
          trend:
            (latest?.newApplicationsDelta ?? 0) > 0
              ? "accelerating"
              : (latest?.newApplicationsDelta ?? 0) < 0
                ? "decelerating"
                : "flat",
        },
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: getAgentCosts
// ---------------------------------------------------------------------------
export function makeGetAgentCostsTool(userId: string) {
  return tool({
    description:
      "Retrieve agent cost tracking data — API usage, time investment per task, and ROI analysis by department. Helps track the efficiency of each agent.",
    inputSchema: z.object({
      daysBack: z
        .number()
        .int()
        .min(1)
        .max(90)
        .default(30)
        .describe("Number of days back to analyze agent costs"),
    }),
    execute: async (input) => {
      const supabase = await createClient();
      const since = new Date(
        Date.now() - input.daysBack * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: logs } = await supabase
        .from("agent_logs")
        .select("agent, action, tokens_used, cost_usd, duration_ms, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (!logs || logs.length === 0) {
        return {
          daysBack: input.daysBack,
          totalCostUsd: 0,
          totalTokensUsed: 0,
          totalInvocations: 0,
          byAgent: {},
          insight: "No agent logs found in this window.",
        };
      }

      const byAgent: Record<
        string,
        { invocations: number; totalTokens: number; totalCostUsd: number; avgDurationMs: number }
      > = {};

      let totalCostUsd = 0;
      let totalTokensUsed = 0;
      const durations: number[] = [];

      for (const log of logs) {
        const agent = (log.agent as string) ?? "unknown";
        if (!byAgent[agent]) {
          byAgent[agent] = { invocations: 0, totalTokens: 0, totalCostUsd: 0, avgDurationMs: 0 };
        }
        byAgent[agent].invocations++;
        byAgent[agent].totalTokens += (log.tokens_used as number) ?? 0;
        byAgent[agent].totalCostUsd += (log.cost_usd as number) ?? 0;
        totalCostUsd += (log.cost_usd as number) ?? 0;
        totalTokensUsed += (log.tokens_used as number) ?? 0;

        if (log.duration_ms) {
          durations.push(log.duration_ms as number);
          byAgent[agent].avgDurationMs =
            (byAgent[agent].avgDurationMs * (byAgent[agent].invocations - 1) +
              (log.duration_ms as number)) /
            byAgent[agent].invocations;
        }
      }

      const avgDurationMs =
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

      const mostExpensiveAgent = Object.entries(byAgent).sort(
        ([, a], [, b]) => b.totalCostUsd - a.totalCostUsd
      )[0];

      return {
        daysBack: input.daysBack,
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        totalTokensUsed,
        totalInvocations: logs.length,
        avgDurationMs: Math.round(avgDurationMs),
        byAgent,
        mostExpensiveAgent: mostExpensiveAgent ? mostExpensiveAgent[0] : null,
        insight:
          totalCostUsd > 1
            ? `Total agent spend: $${totalCostUsd.toFixed(4)} over ${input.daysBack} days. ${mostExpensiveAgent ? `${mostExpensiveAgent[0]} is the highest-cost agent.` : ""}`
            : `Low agent spend: $${totalCostUsd.toFixed(4)} over ${input.daysBack} days — efficient pipeline.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: getDailySnapshot
// ---------------------------------------------------------------------------
export function makeGetDailySnapshotTool(userId: string) {
  return tool({
    description:
      "Read daily_snapshots for historical pipeline comparison. Shows how the pipeline has evolved over time — total applications, conversion rates, and stale counts by date.",
    inputSchema: z.object({
      daysBack: z
        .number()
        .int()
        .min(1)
        .max(90)
        .default(14)
        .describe("Number of days of snapshots to retrieve"),
    }),
    execute: async (input) => {
      const supabase = await createClient();
      const since = new Date(
        Date.now() - input.daysBack * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0];

      const { data, error } = await supabase
        .from("daily_snapshots")
        .select(
          "snapshot_date:date, total_applications, conversion_rate, stale_count, applied_count, screening_count, interview_count, offer_count"
        )
        .eq("user_id", userId)
        .gte("date", since)
        .order("date", { ascending: false });

      if (error || !data) {
        return {
          daysBack: input.daysBack,
          snapshots: [],
          insight: "No snapshot data available.",
        };
      }

      const snapshots = (data ?? []).map((s) => ({
        date: s.snapshot_date as string,
        totalApplications: (s.total_applications as number) ?? 0,
        conversionRate: Number(s.conversion_rate ?? 0),
        staleCount: (s.stale_count as number) ?? 0,
        appliedCount: (s.applied_count as number) ?? 0,
        screeningCount: (s.screening_count as number) ?? 0,
        interviewCount: (s.interview_count as number) ?? 0,
        offerCount: (s.offer_count as number) ?? 0,
      }));

      // Trend detection
      const oldest = snapshots[snapshots.length - 1];
      const newest = snapshots[0];
      let trend = "stable";
      if (oldest && newest && oldest.totalApplications !== newest.totalApplications) {
        trend =
          newest.totalApplications > oldest.totalApplications
            ? "growing"
            : "shrinking";
      }

      return {
        daysBack: input.daysBack,
        snapshots,
        trend,
        latestSnapshot: newest ?? null,
        insight: snapshots.length === 0
          ? "No historical snapshot data found."
          : `${snapshots.length} days of data. Pipeline is ${trend}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 6: benchmarkPerformance
// ---------------------------------------------------------------------------
export function makeBenchmarkPerformanceTool(userId: string) {
  return tool({
    description:
      "Compare the user's pipeline metrics against industry averages and top-quartile performers. Returns a scorecard with percentile estimates.",
    inputSchema: z.object({}),
    execute: async () => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("applications")
        .select("status, created_at, last_activity_at")
        .eq("user_id", userId);

      if (error || !data || data.length === 0) {
        return {
          score: null,
          metrics: [],
          insight: "Not enough data to benchmark performance. Add more applications first.",
        };
      }

      const byStatus: Record<string, number> = {};
      for (const row of data) {
        const s = (row.status as string) ?? "discovered";
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }

      const applied = byStatus["applied"] ?? 0;
      const screening = byStatus["screening"] ?? 0;
      const interviewScheduled = byStatus["interview_scheduled"] ?? 0;
      const interviewing = byStatus["interviewing"] ?? 0;
      const offer = byStatus["offer"] ?? 0;

      const interviewTotal = interviewScheduled + interviewing;

      const appliedToScreeningRate = applied > 0 ? (screening / applied) * 100 : 0;
      const screeningToInterviewRate = screening > 0 ? (interviewTotal / screening) * 100 : 0;
      const interviewToOfferRate = interviewTotal > 0 ? (offer / interviewTotal) * 100 : 0;

      // Percentile estimation based on benchmarks
      const estimatePercentile = (
        value: number,
        avg: number,
        topQuartile: number
      ): number => {
        if (value >= topQuartile) return 85 + Math.min(15, ((value - topQuartile) / topQuartile) * 15);
        if (value >= avg) return 50 + ((value - avg) / (topQuartile - avg)) * 35;
        return Math.max(5, (value / avg) * 50);
      };

      const metrics = [
        {
          name: "Applied→Screening Rate",
          userValue: appliedToScreeningRate,
          industryAvg: BENCHMARKS.appliedToScreening.avg,
          topQuartile: BENCHMARKS.appliedToScreening.topQuartile,
          estimatedPercentile: estimatePercentile(
            appliedToScreeningRate,
            BENCHMARKS.appliedToScreening.avg,
            BENCHMARKS.appliedToScreening.topQuartile
          ),
          unit: "%",
        },
        {
          name: "Screening→Interview Rate",
          userValue: screeningToInterviewRate,
          industryAvg: BENCHMARKS.screeningToInterview.avg,
          topQuartile: BENCHMARKS.screeningToInterview.topQuartile,
          estimatedPercentile: estimatePercentile(
            screeningToInterviewRate,
            BENCHMARKS.screeningToInterview.avg,
            BENCHMARKS.screeningToInterview.topQuartile
          ),
          unit: "%",
        },
        {
          name: "Interview→Offer Rate",
          userValue: interviewToOfferRate,
          industryAvg: BENCHMARKS.interviewToOffer.avg,
          topQuartile: BENCHMARKS.interviewToOffer.topQuartile,
          estimatedPercentile: estimatePercentile(
            interviewToOfferRate,
            BENCHMARKS.interviewToOffer.avg,
            BENCHMARKS.interviewToOffer.topQuartile
          ),
          unit: "%",
        },
      ];

      const avgPercentile =
        metrics.reduce((sum, m) => sum + m.estimatedPercentile, 0) / metrics.length;

      const overallGrade =
        avgPercentile >= 75
          ? "A"
          : avgPercentile >= 60
            ? "B"
            : avgPercentile >= 45
              ? "C"
              : avgPercentile >= 30
                ? "D"
                : "F";

      const weakest = metrics.sort(
        (a, b) => a.estimatedPercentile - b.estimatedPercentile
      )[0];

      return {
        overallGrade,
        estimatedPercentile: Math.round(avgPercentile),
        metrics,
        weakestMetric: weakest?.name ?? null,
        totalApplicationsAnalyzed: data.length,
        insight: `Overall performance: ${overallGrade} (est. ${Math.round(avgPercentile)}th percentile). Weakest area: ${weakest?.name ?? "N/A"}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCFOTools(userId: string) {
  return {
    getConversionFunnel: makeGetConversionFunnelTool(userId),
    getPipelineVelocity: makeGetPipelineVelocityTool(userId),
    getWeeklyTrend: makeGetWeeklyTrendTool(userId),
    getAgentCosts: makeGetAgentCostsTool(userId),
    getDailySnapshot: makeGetDailySnapshotTool(userId),
    benchmarkPerformance: makeBenchmarkPerformanceTool(userId),
  };
}
