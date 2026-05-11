/**
 * Contract tests for GET /api/cron/rolling-invites.
 *
 * Auth coverage is bound by the integration audit; here we exercise the
 * gating layers, the per-row state machine, and the OutreachBrake ceiling.
 *
 * The Supabase mock is a deliberately small state machine: every query
 * shape the route uses (select waiting rows, update row by id) is dispatched
 * by table + method so the fixture stays declarative. The Resend mock is
 * the load-bearing side-effect surface and is asserted via call count +
 * payload shape.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

// The route reads GATE_CONFIG.beta.{mode,rollingInvitesPerDay} on every
// call; expose both as plain object fields the test can mutate per case.
// `brand.url()` is a thunk in the real config so we mirror that here.
const gateMock = vi.hoisted(() => ({
  current: {
    brand: {
      name: "The Tower",
      senderEmail: "concierge@interntower.com",
      url: () => "https://www.interntower.com",
    },
    beta: {
      mode: "rolling" as "rolling" | "waitlist" | "open",
      rollingInvitesPerDay: 25,
    },
  },
}));
vi.mock("@/lib/config/gate-config", () => ({
  get GATE_CONFIG() {
    return gateMock.current;
  },
}));

// Resend SDK shim. The route constructs `new Resend(key)` once per call so
// expose a class with a shared `send` mock — test-asserting on the mock
// captures both per-row payloads and the cumulative call count.
const resendSendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => {
  class MockResend {
    emails: { send: typeof resendSendMock };
    constructor() {
      this.emails = { send: resendSendMock };
    }
  }
  return { Resend: MockResend };
});

const logErrorMock = vi.hoisted(() => vi.fn());
const logWarnMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: logWarnMock,
    error: logErrorMock,
  },
}));

// Audit hash is opaque from the test's point of view — stable map so we
// can assert structured logs without caring about the digest format.
vi.mock("@/lib/audit/pii-redact", () => ({
  hashForAudit: (input: string) => `hash:${input}`,
}));

interface WaitingRow {
  id: string;
  email: string;
  created_at: string;
}

const fixture: {
  waiting: WaitingRow[];
  fetchError: { message: string } | null;
  updates: Array<{ id: string; patch: Record<string, unknown> }>;
  updateErrorFor: Set<string>;
} = {
  waiting: [],
  fetchError: null,
  updates: [],
  updateErrorFor: new Set(),
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "waitlist_signups") {
        throw new Error(`Unexpected table ${table}`);
      }
      let pulledLimit: number | null = null;
      const selectChain = {
        eq: () => selectChain,
        is: () => selectChain,
        order: () => selectChain,
        limit: async (n: number) => {
          pulledLimit = n;
          if (fixture.fetchError) {
            return { data: null, error: fixture.fetchError };
          }
          const data =
            pulledLimit !== null && fixture.waiting.length > pulledLimit
              ? fixture.waiting.slice(0, pulledLimit)
              : fixture.waiting;
          return { data, error: null };
        },
      };
      return {
        select: () => selectChain,
        update: (patch: Record<string, unknown>) => {
          let capturedId = "";
          const updateChain = {
            eq: (col: string, val: string) => {
              if (col === "id") capturedId = val;
              return updateChain;
            },
            is: async () => {
              fixture.updates.push({ id: capturedId, patch });
              if (fixture.updateErrorFor.has(capturedId)) {
                return { data: null, error: { message: "update failed" } };
              }
              return { data: null, error: null };
            },
          };
          return updateChain;
        },
      };
    },
  }),
}));

const REQUIRED_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  RESEND_API_KEY: "re_test_invitecron",
};

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/rolling-invites", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

function waitingRow(idx: number): WaitingRow {
  return {
    id: `wl-${idx}`,
    email: `guest-${idx}@example.com`,
    created_at: new Date(2026, 0, 1, idx).toISOString(),
  };
}

describe("GET /api/cron/rolling-invites", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    resendSendMock.mockReset();
    logErrorMock.mockReset();
    logWarnMock.mockReset();
    fixture.waiting = [];
    fixture.fetchError = null;
    fixture.updates = [];
    fixture.updateErrorFor = new Set();
    verifyMock.mockReturnValue({ ok: true });
    resendSendMock.mockResolvedValue({ data: { id: "msg-default" }, error: null });
    gateMock.current.beta = {
      mode: "rolling",
      rollingInvitesPerDay: 25,
    };
    for (const k of Object.keys(REQUIRED_ENV)) {
      process.env[k] = REQUIRED_ENV[k];
    }
    delete process.env.OUTREACH_MAX_PER_TICK_GLOBAL;
    delete process.env.OUTREACH_FREEZE_OVERRIDE;
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    delete process.env.OUTREACH_MAX_PER_TICK_GLOBAL;
    delete process.env.OUTREACH_FREEZE_OVERRIDE;
    _resetEnvCacheForTests();
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("skips when beta mode is not 'rolling'", async () => {
    gateMock.current.beta = { mode: "waitlist", rollingInvitesPerDay: 25 };
    fixture.waiting = [waitingRow(1), waitingRow(2)];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      skipped: string;
      count: number;
    };
    expect(body.skipped).toBe("mode_not_rolling");
    expect(body.count).toBe(0);
    // Critically: no DB read, no Resend call.
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(fixture.updates).toHaveLength(0);
  });

  it("returns 200 + zero invited when the queue is empty under 'rolling'", async () => {
    fixture.waiting = [];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      invited: number;
      failed: number;
    };
    expect(body.invited).toBe(0);
    expect(body.failed).toBe(0);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("invites 5 rows when 5 are waiting and stamps them as 'invited'", async () => {
    fixture.waiting = [
      waitingRow(1),
      waitingRow(2),
      waitingRow(3),
      waitingRow(4),
      waitingRow(5),
    ];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { invited: number; failed: number };
    expect(body.invited).toBe(5);
    expect(body.failed).toBe(0);
    expect(resendSendMock).toHaveBeenCalledTimes(5);

    // Every Resend payload carries the doorman subject + an HTML body and a
    // text body. The `to` matches the row email; the body contains the
    // invite URL with the row id as the token.
    for (let i = 0; i < 5; i += 1) {
      const call = resendSendMock.mock.calls[i]?.[0] as {
        to: string;
        subject: string;
        text: string;
        html: string;
        from: string;
      };
      expect(call.to).toBe(`guest-${i + 1}@example.com`);
      expect(call.subject).toBe("You're in: The Tower is open for you");
      expect(call.from).toBe("concierge@interntower.com");
      expect(call.text).toContain(`invite=wl-${i + 1}`);
      expect(call.html).toContain(`invite=wl-${i + 1}`);
    }

    // Every row should have been stamped invited with a stamped invited_at.
    expect(fixture.updates).toHaveLength(5);
    for (const u of fixture.updates) {
      expect(u.patch.status).toBe("invited");
      expect(typeof u.patch.invited_at).toBe("string");
    }
  });

  it("caps invites at the daily ceiling (25) when 30 are waiting", async () => {
    fixture.waiting = Array.from({ length: 30 }, (_, i) => waitingRow(i + 1));
    gateMock.current.beta = { mode: "rolling", rollingInvitesPerDay: 25 };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      invited: number;
      failed: number;
      ceiling: number;
    };
    expect(body.invited).toBe(25);
    expect(body.failed).toBe(0);
    expect(body.ceiling).toBe(25);
    expect(resendSendMock).toHaveBeenCalledTimes(25);
    expect(fixture.updates).toHaveLength(25);
  });

  it("on a Resend rate-limit error mid-batch, leaves that row in 'waiting'", async () => {
    fixture.waiting = [
      waitingRow(1),
      waitingRow(2),
      waitingRow(3),
      waitingRow(4),
      waitingRow(5),
    ];
    resendSendMock.mockImplementation(async (payload: { to: string }) => {
      if (payload.to === "guest-3@example.com") {
        return { data: null, error: { message: "rate_limit_exceeded" } };
      }
      return { data: { id: `msg-${payload.to}` }, error: null };
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      invited: number;
      failed: number;
      results: Array<{ id: string; status: string }>;
    };
    expect(body.invited).toBe(4);
    expect(body.failed).toBe(1);
    // Row 3 must NOT have been stamped invited.
    const row3 = fixture.updates.find((u) => u.id === "wl-3");
    expect(row3).toBeUndefined();
    // Rows 1,2,4,5 should each appear once with status=invited.
    expect(fixture.updates).toHaveLength(4);
    const failedRow = body.results.find((r) => r.id === "wl-3");
    expect(failedRow?.status).toBe("failed");
  });

  it("on RESEND_API_KEY unset, returns 200 with skipped='no_resend_key'", async () => {
    delete process.env.RESEND_API_KEY;
    _resetEnvCacheForTests();
    fixture.waiting = [waitingRow(1)];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skipped: string; count: number };
    expect(body.skipped).toBe("no_resend_key");
    expect(body.count).toBe(0);
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(fixture.updates).toHaveLength(0);
  });

  it("returns 500 when the waitlist fetch errors", async () => {
    fixture.fetchError = { message: "db broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("honors OUTREACH_MAX_PER_TICK_GLOBAL by clamping below dailyCeiling", async () => {
    fixture.waiting = Array.from({ length: 30 }, (_, i) => waitingRow(i + 1));
    gateMock.current.beta = { mode: "rolling", rollingInvitesPerDay: 25 };
    process.env.OUTREACH_MAX_PER_TICK_GLOBAL = "10";
    _resetEnvCacheForTests();
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { invited: number; ceiling: number };
    expect(body.invited).toBe(10);
    expect(body.ceiling).toBe(10);
  });

  it("bypasses the global ceiling when OUTREACH_FREEZE_OVERRIDE=1", async () => {
    fixture.waiting = Array.from({ length: 30 }, (_, i) => waitingRow(i + 1));
    gateMock.current.beta = { mode: "rolling", rollingInvitesPerDay: 25 };
    process.env.OUTREACH_MAX_PER_TICK_GLOBAL = "10";
    process.env.OUTREACH_FREEZE_OVERRIDE = "1";
    _resetEnvCacheForTests();
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { invited: number; ceiling: number };
    // Daily ceiling reasserts as the only cap once the brake is overridden.
    expect(body.invited).toBe(25);
    expect(body.ceiling).toBe(25);
  });

  it("captures a thrown Resend error and continues the batch", async () => {
    fixture.waiting = [waitingRow(1), waitingRow(2)];
    resendSendMock.mockImplementationOnce(async () => {
      throw new Error("network down");
    });
    resendSendMock.mockResolvedValueOnce({
      data: { id: "msg-recover" },
      error: null,
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { invited: number; failed: number };
    expect(body.failed).toBe(1);
    expect(body.invited).toBe(1);
  });
});
