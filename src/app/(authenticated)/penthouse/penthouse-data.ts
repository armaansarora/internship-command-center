import { createClient } from "@/lib/supabase/server";
import {
  decodeBriefing,
} from "@/lib/penthouse/briefing-storage";
import { synthesizeFallbackBriefing } from "@/lib/penthouse/briefing-fallback";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";
import {
  pipelineWeatherDelta,
  weatherLabel,
} from "@/lib/penthouse/pipeline-weather";
import { timeOfDayFor, type TimeOfDay } from "@/lib/penthouse/time-of-day";

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
 * Scene payload consumed by the new R2 Penthouse client — bundles the
 * existing dashboard data with morning-briefing, overnight signal, pipeline
 * weather, and the user's current time-of-day window.
 */
export interface PenthouseScene {
  /** Existing dashboard state — used inside RestPanel. */
  stats: PenthouseStats;
  pipeline: PipelineStageData[];
  activity: ActivityItemData[];

  /** Pre-computed structured briefing (nullable on first-time users). */
  briefing: MorningBriefing | null;

  /** Overnight deltas in the last 24h (for scene copy + weather). */
  overnightDelta: {
    newApps: number;
    responses: number;
    rejections: number;
    importantEmailCount: number;
  };

  /** Skyline weather tint + human label. */
  weather: { delta: number; label: "dim" | "cool" | "gold" };

  /** Time window for the SceneRouter — SSR-computed in the user's timezone. */
  timeOfDay: TimeOfDay;

  /** User signals for the scene. */
  user: {
    userId: string;
    displayName: string;
    email: string;
    timezone: string | null;
  };

  /** YYYY-MM-DD in the user's timezone — used by useIdleDetail. */
  dateIso: string;

  /** True if the user had any rejections in the last 24h (idle-detail override). */
  recentRejection: boolean;

  /** True when today's briefing was already cron-generated. */
  briefingGenerated: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Gather everything the Penthouse scene needs in one round-trip-friendly
 * function. Returns safe defaults on any failure — the scene must always
 * render something, never an error page.
 */
export async function fetchPenthouseScene(user: {
  id: string;
  displayName: string;
  email: string;
}): Promise<PenthouseScene> {
  const supabase = await createClient();

  // 1. Existing dashboard payload (stats, pipeline, activity).
  const existing = await fetchPenthouseData(user.id);

  // 2. Resolve user timezone (from user_profiles).
  let timezone: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();
    timezone = (profile?.timezone as string | null) ?? null;
  } catch {
    timezone = null;
  }

  const now = new Date();
  const dateIso = formatDateIsoInTimezone(now, timezone);
  const timeOfDay = timeOfDayFor(now, timezone ?? undefined);

  // 3. Pull today's briefing from notifications (newest-first, created within
  //    the last 24h). Decode via briefing-storage.
  let briefing: MorningBriefing | null = null;
  let briefingGenerated = false;
  try {
    const dayStart = new Date(Date.now() - DAY_MS).toISOString();
    const { data: rows } = await supabase
      .from("notifications")
      .select("body, created_at")
      .eq("user_id", user.id)
      .eq("type", "daily_briefing")
      .gte("created_at", dayStart)
      .order("created_at", { ascending: false })
      .limit(1);
    const body = (rows?.[0]?.body as string | null) ?? null;
    briefing = decodeBriefing(body);
    briefingGenerated = briefing !== null;
  } catch {
    briefing = null;
  }

  // 4. Overnight signal (last 24h) — apps + emails.
  const windowStart = new Date(Date.now() - DAY_MS).toISOString();
  const [recentAppsResult, recentEmailsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, updated_at")
      .eq("user_id", user.id)
      .gte("updated_at", windowStart),
    supabase
      .from("emails")
      .select("id, classification")
      .eq("user_id", user.id)
      .gte("received_at", windowStart),
  ]);
  const recentApps = recentAppsResult.data ?? [];
  const recentEmails = recentEmailsResult.data ?? [];

  const newApps = recentApps.filter((a) => a.status === "discovered").length;
  const rejections = recentApps.filter((a) => a.status === "rejected").length;
  const responses = recentApps.filter(
    (a) => a.status !== "discovered" && a.status !== "rejected" && a.status !== "withdrawn"
  ).length;
  const importantEmailCount = recentEmails.filter(
    (e) => e.classification === "interview_invite" || e.classification === "offer"
  ).length;
  const recentRejection = rejections > 0;

  // 5. Synthesize a client-side fallback briefing if cron hasn't run yet.
  //    The fallback keeps the scene alive; cron will overwrite on its next run.
  if (!briefing) {
    briefing = synthesizeFallbackBriefing({
      displayName: user.displayName,
      pipeline: {
        total: existing.stats.inPipeline,
        applied: 0,
        screening: 0,
        interviews: existing.stats.interviews,
        offers: 0,
        staleCount: 0,
        appliedToScreeningRate: 0,
      },
      overnight: {
        newApps,
        statusChanges: responses,
        importantEmails: [],
        rejections,
      },
    });
  }

  // 6. Pipeline weather.
  const weatherDelta = pipelineWeatherDelta({
    newApps,
    responses,
    rejections,
    staleCount: 0, // staleCount isn't denormalized here; fallback to 0
    importantEmailCount,
  });

  return {
    ...existing,
    briefing,
    overnightDelta: { newApps, responses, rejections, importantEmailCount },
    weather: { delta: weatherDelta, label: weatherLabel(weatherDelta) },
    timeOfDay,
    user: {
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      timezone,
    },
    dateIso,
    recentRejection,
    briefingGenerated,
  };
}

/** Format a Date as YYYY-MM-DD in an IANA timezone. Falls back to UTC. */
function formatDateIsoInTimezone(d: Date, tz: string | null): string {
  if (!tz) return d.toISOString().slice(0, 10);
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: tz,
    });
    return fmt.format(d); // en-CA → YYYY-MM-DD natively
  } catch {
    return d.toISOString().slice(0, 10);
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
