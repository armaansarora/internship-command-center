/**
 * Contract tests for GET /api/cron/owner-watchdog.
 *
 * Covers (mirroring docs/TESTING.md "Cron route test template"):
 *   1. 401 on bad auth.
 *   2. Empty-state happy path — no incidents → 200 + zero counters, no email.
 *   3. New incident → row inserted, email sent, counters {opened:1, resolved:0}.
 *   4. Existing open incident, no recovery, fresh last_email_at → row
 *      unchanged, no extra email until 6h elapses.
 *   5. Recovery path → resolved_at stamped, recovery email sent.
 *   6. RESEND_API_KEY unset → 200 + counters, no crash.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const NOW_ISO = "2026-05-11T12:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findOpenMock = vi.hoisted(() => vi.fn());
const openIncidentMock = vi.hoisted(() => vi.fn());
const stampReminderMock = vi.hoisted(() => vi.fn());
const resolveIncidentMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability/incident-alerts-rest", () => ({
  findOpenIncident: findOpenMock,
  openIncident: openIncidentMock,
  stampReminder: stampReminderMock,
  resolveIncident: resolveIncidentMock,
}));

const sendDigestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/owner-digest", () => ({
  sendOwnerDigest: sendDigestMock,
}));

const envValue = vi.hoisted(() => ({
  current: {
    RESEND_API_KEY: "re_test_123",
    OWNER_ALERT_EMAIL: undefined as string | undefined,
    WATCHDOG_HOURLY_COST_CAP_CENTS: undefined as number | undefined,
  },
}));
vi.mock("@/lib/env", () => ({
  env: () => envValue.current,
}));

vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    brand: { senderEmail: "concierge@interntower.com" },
  },
}));

vi.mock("@/lib/observability/production-health", () => ({
  configuredCronJobNames: () => ["warmth-decay", "cfo-threshold"],
  staleThreshold: (jobName: string) =>
    jobName === "cfo-threshold" ? 8 * 24 * 60 * 60 * 1000 : 36 * 60 * 60 * 1000,
}));

interface FixtureState {
  cronRuns: Array<Record<string, unknown>>;
  stripeFailedCount: number;
  agentCostRows: Array<{ cost_cents: string | number | null }>;
  errors: { cron?: string; stripe?: string; cost?: string };
}

const fixture: FixtureState = {
  cronRuns: [],
  stripeFailedCount: 0,
  agentCostRows: [],
  errors: {},
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "cron_runs") {
        return {
          select: () => ({
            order: () => ({
              limit: async () =>
                fixture.errors.cron
                  ? { data: null, error: { message: fixture.errors.cron } }
                  : { data: fixture.cronRuns, error: null },
            }),
          }),
        };
      }
      if (table === "stripe_webhook_events") {
        return {
          select: () => ({
            eq: () => ({
              gte: async () =>
                fixture.errors.stripe
                  ? {
                      count: null,
                      error: { message: fixture.errors.stripe },
                    }
                  : { count: fixture.stripeFailedCount, error: null },
            }),
          }),
        };
      }
      if (table === "agent_logs") {
        return {
          select: () => ({
            gte: () => ({
              limit: async () =>
                fixture.errors.cost
                  ? { data: null, error: { message: fixture.errors.cost } }
                  : { data: fixture.agentCostRows, error: null },
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/owner-watchdog", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

function freshCron(now: number, jobName: string): Record<string, unknown> {
  // 1 minute ago = always fresh.
  return {
    job_name: jobName,
    started_at: new Date(now - 60_000).toISOString(),
    finished_at: new Date(now - 30_000).toISOString(),
    success: true,
    error_message: null,
  };
}

beforeEach(() => {
  verifyMock.mockReset();
  findOpenMock.mockReset();
  openIncidentMock.mockReset();
  stampReminderMock.mockReset();
  resolveIncidentMock.mockReset();
  sendDigestMock.mockReset();
  fixture.cronRuns = [];
  fixture.stripeFailedCount = 0;
  fixture.agentCostRows = [];
  fixture.errors = {};
  envValue.current = {
    RESEND_API_KEY: "re_test_123",
    OWNER_ALERT_EMAIL: undefined,
    WATCHDOG_HOURLY_COST_CAP_CENTS: undefined,
  };
  verifyMock.mockReturnValue({ ok: true });
  findOpenMock.mockResolvedValue(null);
  openIncidentMock.mockImplementation(async (input: {
    jobName: string;
    severity: "warn" | "crit";
    lastSeenValue?: string | null;
  }) => ({
    id: `inc-${input.jobName}`,
    job_name: input.jobName,
    severity: input.severity,
    last_seen_value: input.lastSeenValue ?? null,
    opened_at: NOW_ISO,
    last_email_at: NOW_ISO,
    resolved_at: null,
    created_at: NOW_ISO,
  }));
  stampReminderMock.mockResolvedValue(true);
  resolveIncidentMock.mockResolvedValue(true);
  sendDigestMock.mockResolvedValue({ skipped: false, messageId: "msg-1", error: null });
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

describe("GET /api/cron/owner-watchdog", () => {
  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    vi.useRealTimers();
  });

  it("returns 200 + zero counters and sends no email when everything is healthy", async () => {
    // All configured crons fresh, no stripe failures, no AI cost.
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      opened: number;
      resolved: number;
      reminded: number;
    };
    expect(body).toEqual({ ok: true, opened: 0, resolved: 0, reminded: 0 });
    expect(openIncidentMock).not.toHaveBeenCalled();
    expect(resolveIncidentMock).not.toHaveBeenCalled();
    expect(sendDigestMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("opens a new incident + sends 'detected' digest when stripe webhooks fail", async () => {
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    fixture.stripeFailedCount = 3;
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      opened: number;
      resolved: number;
      reminded: number;
    };
    expect(body.opened).toBe(1);
    expect(body.resolved).toBe(0);
    expect(body.reminded).toBe(0);
    expect(openIncidentMock).toHaveBeenCalledTimes(1);
    const [openArg] = openIncidentMock.mock.calls[0] as [
      { jobName: string; severity: string; lastSeenValue: string },
    ];
    expect(openArg.jobName).toBe("stripe-webhooks");
    expect(openArg.severity).toBe("crit");
    expect(openArg.lastSeenValue).toContain("3 failed");
    expect(sendDigestMock).toHaveBeenCalledTimes(1);
    const [digestArg] = sendDigestMock.mock.calls[0] as [
      { kind: string; incidents: Array<{ jobName: string }> },
    ];
    expect(digestArg.kind).toBe("detected");
    expect(digestArg.incidents).toHaveLength(1);
    expect(digestArg.incidents[0].jobName).toBe("stripe-webhooks");
    vi.useRealTimers();
  });

  it("does not page again for an open incident whose last_email_at is fresh", async () => {
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    fixture.stripeFailedCount = 3;
    // Already open, emailed 5 minutes ago — reminder window not yet elapsed.
    findOpenMock.mockImplementation(async (jobName: string) =>
      jobName === "stripe-webhooks"
        ? {
            id: "inc-stripe-webhooks",
            job_name: "stripe-webhooks",
            severity: "crit",
            last_seen_value: "3 failed in 24h",
            opened_at: new Date(NOW_MS - 30 * 60_000).toISOString(),
            last_email_at: new Date(NOW_MS - 5 * 60_000).toISOString(),
            resolved_at: null,
            created_at: new Date(NOW_MS - 30 * 60_000).toISOString(),
          }
        : null,
    );
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      opened: number;
      resolved: number;
      reminded: number;
    };
    expect(body.opened).toBe(0);
    expect(body.reminded).toBe(0);
    expect(stampReminderMock).not.toHaveBeenCalled();
    expect(openIncidentMock).not.toHaveBeenCalled();
    expect(sendDigestMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("re-pages with a reminder digest when last_email_at is older than 6h", async () => {
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    fixture.stripeFailedCount = 3;
    findOpenMock.mockImplementation(async (jobName: string) =>
      jobName === "stripe-webhooks"
        ? {
            id: "inc-stripe-webhooks",
            job_name: "stripe-webhooks",
            severity: "crit",
            last_seen_value: "3 failed in 24h",
            opened_at: new Date(NOW_MS - 10 * 60 * 60 * 1000).toISOString(),
            last_email_at: new Date(NOW_MS - 7 * 60 * 60 * 1000).toISOString(),
            resolved_at: null,
            created_at: new Date(NOW_MS - 10 * 60 * 60 * 1000).toISOString(),
          }
        : null,
    );
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      opened: number;
      resolved: number;
      reminded: number;
    };
    expect(body.reminded).toBe(1);
    expect(stampReminderMock).toHaveBeenCalledWith("inc-stripe-webhooks");
    expect(sendDigestMock).toHaveBeenCalledTimes(1);
    const [digestArg] = sendDigestMock.mock.calls[0] as [{ kind: string }];
    expect(digestArg.kind).toBe("reminder");
    vi.useRealTimers();
  });

  it("recovers an open incident + sends recovery digest when signal clears", async () => {
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    fixture.stripeFailedCount = 0;
    findOpenMock.mockImplementation(async (jobName: string) =>
      jobName === "stripe-webhooks"
        ? {
            id: "inc-stripe-webhooks",
            job_name: "stripe-webhooks",
            severity: "crit",
            last_seen_value: "3 failed in 24h",
            opened_at: new Date(NOW_MS - 6 * 60 * 60 * 1000).toISOString(),
            last_email_at: new Date(NOW_MS - 6 * 60 * 60 * 1000).toISOString(),
            resolved_at: null,
            created_at: new Date(NOW_MS - 6 * 60 * 60 * 1000).toISOString(),
          }
        : null,
    );
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      opened: number;
      resolved: number;
      reminded: number;
    };
    expect(body.resolved).toBe(1);
    expect(body.opened).toBe(0);
    expect(resolveIncidentMock).toHaveBeenCalledWith("inc-stripe-webhooks");
    expect(sendDigestMock).toHaveBeenCalledTimes(1);
    const [digestArg] = sendDigestMock.mock.calls[0] as [{ kind: string }];
    expect(digestArg.kind).toBe("recovered");
    vi.useRealTimers();
  });

  it("returns 200 + counters even when RESEND_API_KEY is unset (sender skips)", async () => {
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    fixture.stripeFailedCount = 3;
    envValue.current.RESEND_API_KEY = "";
    sendDigestMock.mockResolvedValue({
      skipped: true,
      messageId: null,
      error: null,
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { opened: number };
    expect(body.opened).toBe(1);
    expect(sendDigestMock).toHaveBeenCalledTimes(1);
    expect(openIncidentMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("opens an ai-cost-hourly incident when sum exceeds the cap", async () => {
    fixture.cronRuns = [
      freshCron(NOW_MS, "warmth-decay"),
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    // $7.50 in the last hour, cap is default $5 = 500c.
    fixture.agentCostRows = [
      { cost_cents: "300" },
      { cost_cents: "300" },
      { cost_cents: "150" },
    ];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { opened: number };
    expect(body.opened).toBe(1);
    expect(openIncidentMock).toHaveBeenCalledTimes(1);
    const [openArg] = openIncidentMock.mock.calls[0] as [
      { jobName: string; lastSeenValue: string },
    ];
    expect(openArg.jobName).toBe("ai-cost-hourly");
    expect(openArg.lastSeenValue).toContain("$7.50");
    vi.useRealTimers();
  });

  it("opens cron:<jobName> incident when a cron's last success is stale", async () => {
    // warmth-decay last success 50h ago > 36h threshold; cfo-threshold fresh.
    fixture.cronRuns = [
      {
        job_name: "warmth-decay",
        started_at: new Date(NOW_MS - 50 * 60 * 60 * 1000).toISOString(),
        finished_at: new Date(NOW_MS - 50 * 60 * 60 * 1000).toISOString(),
        success: true,
        error_message: null,
      },
      freshCron(NOW_MS, "cfo-threshold"),
    ];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { opened: number };
    expect(body.opened).toBe(1);
    const openedJobs = (openIncidentMock.mock.calls as Array<
      [{ jobName: string }]
    >).map((c) => c[0].jobName);
    expect(openedJobs).toEqual(["cron:warmth-decay"]);
    vi.useRealTimers();
  });
});
