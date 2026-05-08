import vercelConfig from "../../../vercel.json";
import { isOwner } from "@/lib/auth/owner";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export interface CronHealthRun {
  jobName: string;
  startedAt: string | null;
  finishedAt: string | null;
  success: boolean | null;
  durationMs: number | null;
  errorMessage: string | null;
  stale: boolean;
}

export interface StripeWebhookFailure {
  eventId: string;
  type: string;
  receivedAt: string;
  status: string;
  error: string | null;
}

export interface ProductionHealthSummary {
  status: "ok" | "attention";
  cron: {
    configuredJobs: number;
    lastRuns: CronHealthRun[];
    staleJobs: CronHealthRun[];
    failingJobs: CronHealthRun[];
  };
  stripe: {
    failedRecent: StripeWebhookFailure[];
  };
}

interface CronRunRow {
  job_name: string;
  started_at: string | null;
  finished_at: string | null;
  success: boolean | null;
  error_message: string | null;
  duration_ms: number | null;
}

interface StripeWebhookRow {
  id: string;
  type: string;
  received_at: string;
  status: string;
  error: string | null;
}

const DAILY_STALE_MS = 36 * 60 * 60 * 1000;
const WEEKLY_STALE_MS = 8 * 24 * 60 * 60 * 1000;

function configuredCronJobNames(): string[] {
  return vercelConfig.crons.map((cron) =>
    cron.path.replace(/^\/api\/cron\/?/, ""),
  );
}

function staleThreshold(jobName: string): number {
  return jobName === "cfo-threshold" ? WEEKLY_STALE_MS : DAILY_STALE_MS;
}

function isStale(jobName: string, startedAt: string | null, now: number): boolean {
  if (!startedAt) return true;
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return true;
  return now - started > staleThreshold(jobName);
}

function truncate(value: string | null, max = 160): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

function summarizeCronRuns(rows: CronRunRow[], now: number): ProductionHealthSummary["cron"] {
  const byJob = new Map<string, CronRunRow>();
  for (const row of rows) {
    if (!byJob.has(row.job_name)) byJob.set(row.job_name, row);
  }

  const lastRuns = configuredCronJobNames().map((jobName) => {
    const row = byJob.get(jobName);
    return {
      jobName,
      startedAt: row?.started_at ?? null,
      finishedAt: row?.finished_at ?? null,
      success: row?.success ?? null,
      durationMs: row?.duration_ms ?? null,
      errorMessage: truncate(row?.error_message ?? null),
      stale: isStale(jobName, row?.started_at ?? null, now),
    } satisfies CronHealthRun;
  });

  return {
    configuredJobs: lastRuns.length,
    lastRuns,
    staleJobs: lastRuns.filter((run) => run.stale),
    failingJobs: lastRuns.filter((run) => run.success === false),
  };
}

function summarizeStripeFailures(rows: StripeWebhookRow[]): StripeWebhookFailure[] {
  return rows.map((row) => ({
    eventId: row.id,
    type: row.type,
    receivedAt: row.received_at,
    status: row.status,
    error: truncate(row.error),
  }));
}

export async function readProductionHealthSummary(
  userId: string,
): Promise<ProductionHealthSummary | null> {
  if (!isOwner(userId)) return null;

  try {
    const admin = getSupabaseAdmin();
    const [cronResult, stripeResult] = await Promise.all([
      admin
        .from("cron_runs")
        .select("job_name, started_at, finished_at, success, error_message, duration_ms")
        .order("started_at", { ascending: false })
        .limit(200),
      admin
        .from("stripe_webhook_events")
        .select("id, type, received_at, status, error")
        .eq("status", "failed")
        .order("received_at", { ascending: false })
        .limit(20),
    ]);

    if (cronResult.error) {
      throw new Error(`cron_runs query failed: ${cronResult.error.message}`);
    }
    if (stripeResult.error) {
      throw new Error(
        `stripe_webhook_events query failed: ${stripeResult.error.message}`,
      );
    }

    const cron = summarizeCronRuns((cronResult.data ?? []) as CronRunRow[], Date.now());
    const failedRecent = summarizeStripeFailures(
      (stripeResult.data ?? []) as StripeWebhookRow[],
    );
    return {
      status:
        cron.staleJobs.length > 0 ||
        cron.failingJobs.length > 0 ||
        failedRecent.length > 0
          ? "attention"
          : "ok",
      cron,
      stripe: { failedRecent },
    };
  } catch (err) {
    log.error("production_health.read_failed", err, { userId });
    return {
      status: "attention",
      cron: {
        configuredJobs: configuredCronJobNames().length,
        lastRuns: [],
        staleJobs: [],
        failingJobs: [],
      },
      stripe: { failedRecent: [] },
    };
  }
}
