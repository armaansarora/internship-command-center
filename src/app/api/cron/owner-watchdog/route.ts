import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { withCronHealth } from "@/lib/cron/health";
import { log } from "@/lib/logger";
import { env } from "@/lib/env";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import {
  configuredCronJobNames,
  staleThreshold,
} from "@/lib/observability/production-health";
import {
  findOpenIncident,
  openIncident,
  resolveIncident,
  stampReminder,
  type IncidentAlertRow,
} from "@/lib/observability/incident-alerts-rest";
import {
  sendOwnerDigest,
  type OwnerDigestIncident,
  type OwnerDigestKind,
} from "@/lib/email/owner-digest";

/**
 * GET /api/cron/owner-watchdog
 *
 * Every 30 minutes (see vercel.json). Reads three production signals and
 * emails the owner a Resend digest when something is wrong. Each
 * incident is state-machined through `incident_alerts` so an active
 * incident does NOT page on every tick.
 *
 * Signals read on each run:
 *   1. Cron staleness — for every named cron in vercel.json, check the
 *      most-recent row in `cron_runs` and trip when `now() - started_at`
 *      exceeds the per-job threshold defined in production-health.ts.
 *   2. Stripe webhook failures — count `stripe_webhook_events` with
 *      `status='failed'` in the last 24 hours.
 *   3. AI cost rollup — sum `agent_logs.cost_cents` for the last hour
 *      and trip when it exceeds `WATCHDOG_HOURLY_COST_CAP_CENTS`
 *      (default 500 = $5).
 *
 * State machine per signal:
 *   * No row open for `job_name` AND signal trips → INSERT incident +
 *     send "detected" digest.
 *   * Row already open for `job_name` AND signal STILL trips AND
 *     `now() - last_email_at > 6h` → stamp last_email_at + send
 *     "reminder" digest. Otherwise: no-op (already paging this tick).
 *   * Row open AND signal back below threshold → stamp resolved_at +
 *     send "recovered" digest.
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1).
 * When RESEND_API_KEY is unset, the route still returns 200 + counters
 * and the helper logs a warning — the state machine continues to evolve
 * so when Resend is provisioned the next tick picks up where it left off.
 */
export const maxDuration = 120;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const REMINDER_INTERVAL_MS = 6 * HOUR_MS;
const DEFAULT_HOURLY_COST_CAP_CENTS = 500;

type ProbeOutcome = "tripped" | "ok";

/**
 * One probe result. `signalId` is the durable `job_name` we persist in
 * `incident_alerts` (so reruns line up against the same row); `outcome`
 * decides which state-machine branch fires; `lastSeenValue` is captured
 * on trip so the digest body can quote the snapshot value.
 */
interface Probe {
  signalId: string;
  severity: "warn" | "crit";
  outcome: ProbeOutcome;
  lastSeenValue: string | null;
}

interface CronRunRow {
  job_name: string;
  started_at: string | null;
  finished_at: string | null;
  success: boolean | null;
  error_message: string | null;
}

async function probeCronStaleness(now: number): Promise<Probe[]> {
  const admin = getSupabaseAdmin();
  // 200 rows is enough to find a recent success per configured job; the
  // production-health dashboard uses the same bound.
  const { data, error } = await admin
    .from("cron_runs")
    .select("job_name, started_at, finished_at, success, error_message")
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) {
    log.error("owner_watchdog.cron_read_failed", undefined, {
      error: error.message,
    });
    return [];
  }

  // Pick the most-recent SUCCESSFUL run per configured cron. A failing
  // tick should still count as stale until a healthy run comes through.
  const lastSuccessByJob = new Map<string, string | null>();
  for (const raw of (data ?? []) as CronRunRow[]) {
    if (raw.success === false) continue;
    if (lastSuccessByJob.has(raw.job_name)) continue;
    lastSuccessByJob.set(raw.job_name, raw.started_at);
  }

  const probes: Probe[] = [];
  for (const jobName of configuredCronJobNames()) {
    const lastSuccess = lastSuccessByJob.get(jobName) ?? null;
    const threshold = staleThreshold(jobName);
    const startedMs = lastSuccess ? Date.parse(lastSuccess) : NaN;
    const isStale = !Number.isFinite(startedMs) || now - startedMs > threshold;
    const signalId = `cron:${jobName}`;
    if (isStale) {
      const ageMin = Number.isFinite(startedMs)
        ? Math.round((now - startedMs) / 60_000)
        : null;
      probes.push({
        signalId,
        severity: "warn",
        outcome: "tripped",
        lastSeenValue: ageMin === null
          ? "no successful run on record"
          : `stale by ${ageMin} min`,
      });
    } else {
      probes.push({
        signalId,
        severity: "warn",
        outcome: "ok",
        lastSeenValue: null,
      });
    }
  }
  return probes;
}

async function probeStripeFailures(now: number): Promise<Probe> {
  const admin = getSupabaseAdmin();
  const since = new Date(now - DAY_MS).toISOString();

  const { count, error } = await admin
    .from("stripe_webhook_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("received_at", since);

  if (error) {
    log.error("owner_watchdog.stripe_read_failed", undefined, {
      error: error.message,
    });
    return {
      signalId: "stripe-webhooks",
      severity: "crit",
      outcome: "ok",
      lastSeenValue: null,
    };
  }

  const failedCount = count ?? 0;
  if (failedCount > 0) {
    return {
      signalId: "stripe-webhooks",
      severity: "crit",
      outcome: "tripped",
      lastSeenValue: `${failedCount} failed in last 24h`,
    };
  }

  return {
    signalId: "stripe-webhooks",
    severity: "crit",
    outcome: "ok",
    lastSeenValue: null,
  };
}

async function probeAiCost(now: number, capCents: number): Promise<Probe> {
  const admin = getSupabaseAdmin();
  const since = new Date(now - HOUR_MS).toISOString();

  // Page through the rolling hour. Cost_cents is numeric(10,2); Supabase
  // REST returns it as a string for precision, so we parseFloat each row.
  const { data, error } = await admin
    .from("agent_logs")
    .select("cost_cents, created_at")
    .gte("created_at", since)
    .limit(5_000);

  if (error) {
    log.error("owner_watchdog.cost_read_failed", undefined, {
      error: error.message,
    });
    return {
      signalId: "ai-cost-hourly",
      severity: "crit",
      outcome: "ok",
      lastSeenValue: null,
    };
  }

  let totalCents = 0;
  for (const row of (data ?? []) as Array<{ cost_cents: string | number | null }>) {
    const raw = row.cost_cents;
    if (raw === null || raw === undefined) continue;
    const parsed = typeof raw === "number" ? raw : Number.parseFloat(raw);
    if (Number.isFinite(parsed)) totalCents += parsed;
  }

  if (totalCents > capCents) {
    const dollars = (totalCents / 100).toFixed(2);
    return {
      signalId: "ai-cost-hourly",
      severity: "crit",
      outcome: "tripped",
      lastSeenValue: `$${dollars} in last 1h (cap $${(capCents / 100).toFixed(2)})`,
    };
  }

  return {
    signalId: "ai-cost-hourly",
    severity: "crit",
    outcome: "ok",
    lastSeenValue: null,
  };
}

interface StateTransitions {
  opened: IncidentAlertRow[];
  recovered: IncidentAlertRow[];
  reminded: IncidentAlertRow[];
}

/**
 * Drive the state machine for one probe outcome. Returns whichever
 * transition fired (if any) so the caller can roll them into the digest
 * bucket.
 */
async function reconcile(
  probe: Probe,
  now: number,
): Promise<{
  opened?: IncidentAlertRow;
  reminded?: IncidentAlertRow;
  recovered?: IncidentAlertRow;
}> {
  const open = await findOpenIncident(probe.signalId);

  if (probe.outcome === "tripped") {
    if (!open) {
      const inserted = await openIncident({
        jobName: probe.signalId,
        severity: probe.severity,
        lastSeenValue: probe.lastSeenValue,
      });
      return inserted ? { opened: inserted } : {};
    }
    // Already open — only re-email when the 6h reminder window has elapsed.
    const lastEmailMs = open.last_email_at
      ? Date.parse(open.last_email_at)
      : NaN;
    const fresh = Number.isFinite(lastEmailMs)
      ? now - lastEmailMs >= REMINDER_INTERVAL_MS
      : true;
    if (fresh) {
      const ok = await stampReminder(open.id);
      return ok
        ? {
            reminded: {
              ...open,
              last_email_at: new Date(now).toISOString(),
              last_seen_value: probe.lastSeenValue ?? open.last_seen_value,
            },
          }
        : {};
    }
    return {};
  }

  // Outcome === "ok"
  if (open) {
    const ok = await resolveIncident(open.id);
    return ok
      ? {
          recovered: {
            ...open,
            resolved_at: new Date(now).toISOString(),
            last_email_at: new Date(now).toISOString(),
          },
        }
      : {};
  }
  return {};
}

function toDigestIncident(row: IncidentAlertRow): OwnerDigestIncident {
  return {
    jobName: row.job_name,
    openedAt: row.opened_at,
    lastSeenValue: row.last_seen_value,
  };
}

async function dispatchDigest(
  kind: OwnerDigestKind,
  rows: IncidentAlertRow[],
): Promise<void> {
  if (rows.length === 0) return;

  const to = env().OWNER_ALERT_EMAIL ?? GATE_CONFIG.brand.senderEmail;
  const from = GATE_CONFIG.brand.senderEmail;
  const incidents = rows.map(toDigestIncident);

  const result = await sendOwnerDigest({ to, from, kind, incidents });

  if (result.skipped) {
    log.warn("owner_watchdog.digest_skipped", {
      kind,
      count: incidents.length,
      reason: env().RESEND_API_KEY ? "no_incidents" : "missing_resend_key",
    });
    return;
  }

  if (result.error) {
    log.error("owner_watchdog.digest_failed", undefined, {
      kind,
      count: incidents.length,
      error: result.error,
    });
    return;
  }

  log.info("owner_watchdog.digest_sent", {
    kind,
    count: incidents.length,
    messageId: result.messageId,
  });
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const now = Date.now();
  const capCents =
    env().WATCHDOG_HOURLY_COST_CAP_CENTS ?? DEFAULT_HOURLY_COST_CAP_CENTS;

  // Gather every probe outcome before reconciling, so a failure in one
  // signal cannot prevent the others from progressing through the state
  // machine.
  const [cronProbes, stripeProbe, costProbe] = await Promise.all([
    probeCronStaleness(now),
    probeStripeFailures(now),
    probeAiCost(now, capCents),
  ]);

  const probes: Probe[] = [...cronProbes, stripeProbe, costProbe];

  const transitions: StateTransitions = {
    opened: [],
    recovered: [],
    reminded: [],
  };

  for (const probe of probes) {
    const result = await reconcile(probe, now);
    if (result.opened) transitions.opened.push(result.opened);
    if (result.recovered) transitions.recovered.push(result.recovered);
    if (result.reminded) transitions.reminded.push(result.reminded);
  }

  // Three independent digests: newly-detected, recovered, and "still
  // open after 6h" reminders. Splitting them keeps the subject line
  // accurate and lets the owner triage at a glance.
  await dispatchDigest("detected", transitions.opened);
  await dispatchDigest("recovered", transitions.recovered);
  await dispatchDigest("reminder", transitions.reminded);

  return NextResponse.json({
    ok: true,
    opened: transitions.opened.length,
    resolved: transitions.recovered.length,
    reminded: transitions.reminded.length,
  });
}

export const GET = withCronHealth("owner-watchdog", handle);
