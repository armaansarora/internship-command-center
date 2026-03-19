import { createClient } from "@/lib/supabase/server";

/** Dashboard stats for the Penthouse */
export interface PenthouseStats {
  totalApplications: number;
  inPipeline: number;
  interviews: number;
  responseRate: number;
}

/** Pipeline stage with count */
export interface PipelineStageData {
  name: string;
  count: number;
  color: string;
}

/** Recent activity item */
export interface ActivityItemData {
  id: string;
  type: "application" | "email" | "interview" | "follow_up";
  title: string;
  description: string;
  timestamp: string;
}

/**
 * Status → pipeline stage mapping.
 * Maps application statuses to the 5 pipeline stages.
 */
const STATUS_TO_STAGE: Record<string, string> = {
  discovered: "Saved",
  applied: "Applied",
  screening: "Screen",
  interview_scheduled: "Interview",
  interviewing: "Interview",
  under_review: "Interview",
  offer: "Offer",
  accepted: "Offer",
};

const PIPELINE_COLORS: Record<string, string> = {
  Saved: "var(--text-muted)",
  Applied: "var(--info)",
  Screen: "var(--warning)",
  Interview: "var(--gold)",
  Offer: "var(--success)",
};

/**
 * Fetch dashboard data from Supabase for the authenticated user.
 *
 * Uses the server-side Supabase client (RLS-protected by auth.uid()).
 * Returns safe defaults if any query fails — the dashboard should always render.
 */
export async function fetchPenthouseData(userId: string): Promise<{
  stats: PenthouseStats;
  pipeline: PipelineStageData[];
  activity: ActivityItemData[];
}> {
  const supabase = await createClient();

  // Default values
  const defaultStats: PenthouseStats = {
    totalApplications: 0,
    inPipeline: 0,
    interviews: 0,
    responseRate: 0,
  };

  const defaultPipeline: PipelineStageData[] = [
    { name: "Saved", count: 0, color: PIPELINE_COLORS.Saved },
    { name: "Applied", count: 0, color: PIPELINE_COLORS.Applied },
    { name: "Screen", count: 0, color: PIPELINE_COLORS.Screen },
    { name: "Interview", count: 0, color: PIPELINE_COLORS.Interview },
    { name: "Offer", count: 0, color: PIPELINE_COLORS.Offer },
  ];

  try {
    // Fetch all applications for this user
    const { data: apps, error: appsErr } = await supabase
      .from("applications")
      .select("id, status, created_at, role, company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (appsErr || !apps) {
      return { stats: defaultStats, pipeline: defaultPipeline, activity: [] };
    }

    // Calculate stats
    const totalApplications = apps.length;
    const rejected = apps.filter((a) => a.status === "rejected" || a.status === "withdrawn").length;
    const inPipeline = totalApplications - rejected;

    // Count interviews
    const { count: interviewCount } = await supabase
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const interviews = interviewCount ?? 0;

    // Response rate = (any status beyond "discovered" or "applied") / total
    const responded = apps.filter((a) =>
      !["discovered", "applied"].includes(a.status)
    ).length;
    const applied = apps.filter((a) => a.status !== "discovered").length;
    const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0;

    // Build pipeline counts
    const pipelineCounts: Record<string, number> = {
      Saved: 0, Applied: 0, Screen: 0, Interview: 0, Offer: 0,
    };
    for (const app of apps) {
      if (app.status === "rejected" || app.status === "withdrawn") continue;
      const stage = STATUS_TO_STAGE[app.status] ?? "Saved";
      pipelineCounts[stage] = (pipelineCounts[stage] ?? 0) + 1;
    }

    const pipeline = Object.entries(pipelineCounts).map(([name, count]) => ({
      name,
      count,
      color: PIPELINE_COLORS[name] ?? "var(--text-muted)",
    }));

    // Build recent activity from latest applications
    const activity: ActivityItemData[] = apps.slice(0, 5).map((app) => ({
      id: app.id,
      type: "application" as const,
      title: app.role,
      description: `Status: ${app.status.replace(/_/g, " ")}`,
      timestamp: formatRelativeTime(new Date(app.created_at)),
    }));

    return {
      stats: {
        totalApplications,
        inPipeline,
        interviews,
        responseRate,
      },
      pipeline,
      activity,
    };
  } catch {
    // If Supabase tables don't exist yet or any error, return defaults
    return { stats: defaultStats, pipeline: defaultPipeline, activity: [] };
  }
}

/**
 * Format a date as relative time (e.g., "2h ago", "3d ago").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
