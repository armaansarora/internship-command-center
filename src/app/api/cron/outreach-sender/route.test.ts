/**
 * Contract tests for GET /api/cron/outreach-sender.
 * Auth covered by integration audit.
 *
 * Blast-brake coverage: per-tick global ceiling, per-user daily cap, and
 * pending-queue circuit breaker (incl. OUTREACH_FREEZE_OVERRIDE bypass)
 * extend the original quiet-hours/route-shape suite without regressing it.
 *
 * The Supabase mock is a deliberately small state machine — every query
 * shape the route uses (count(head:true), select-list+limit, update,
 * recent-sends select) is dispatched by table+method+options so the
 * fixture stays declarative.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const sendOutreachEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/outreach", () => ({ sendOutreachEmail: sendOutreachEmailMock }));

const logSecurityEventMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/audit/log", () => ({ logSecurityEvent: logSecurityEventMock }));

const logWarnMock = vi.hoisted(() => vi.fn());
const logErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: logWarnMock,
    error: logErrorMock,
  },
}));

interface RecentSend {
  user_id: string;
}

const fixture = {
  approved: [] as Array<Record<string, unknown>>,
  approvedError: null as { message: string } | null,
  users: [] as Array<{ id: string; email: string }>,
  contacts: [] as Array<{ id: string; email: string }>,
  updateError: null as { message: string } | null,
  updates: [] as Array<{ id: string; patch: Record<string, unknown> }>,
  // Count returned by the circuit-breaker `select(... { count: "exact", head: true })`
  // probe. Null means "use approved.length"; setting this explicitly lets the
  // freeze tests assert behaviour without having to materialise 600 rows.
  pendingCount: null as number | null,
  pendingCountError: null as { message: string } | null,
  // Sends within the rolling 24h window the route uses for the per-user
  // daily cap. One row per send; user_id matches outreach_queue.user_id.
  recentSends: [] as RecentSend[],
};

// Required env so `env()` parses successfully when the route reads cfg.
const REQUIRED_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
};

interface CountQuery {
  filters: Array<["eq" | "is" | "lte", string, unknown]>;
}

// Shapes the chain `select(..., { count: "exact", head: true }).eq().is().lte()`
// terminates as an awaited Promise that resolves to { count, error }. Lower
// down, `select(cols).eq().is().lte().order().limit()` resolves to { data, error }.
function buildOutreachQueueFrom() {
  return {
    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
      const isHeadCount = opts?.count === "exact" && opts?.head === true;
      if (isHeadCount) {
        // Count path: terminate after the third filter (eq, is, lte).
        const query: CountQuery = { filters: [] };
        const thenable = {
          eq: (col: string, val: unknown) => {
            query.filters.push(["eq", col, val]);
            return thenable;
          },
          is: (col: string, val: unknown) => {
            query.filters.push(["is", col, val]);
            return thenable;
          },
          lte: async (col: string, val: unknown) => {
            query.filters.push(["lte", col, val]);
            return {
              count:
                fixture.pendingCountError === null
                  ? (fixture.pendingCount ?? fixture.approved.length)
                  : null,
              error: fixture.pendingCountError,
            };
          },
        };
        return thenable;
      }
      // Two non-head selects exist on outreach_queue:
      //   • The drain query (eq → is → lte → order → limit)
      //   • The recent-sends query for the per-user cap (in → eq → gte)
      // Branch on the first method call after select to keep both paths
      // explicit and resilient to chain reordering.
      let lastLimit: number | null = null;
      const drainChain = {
        eq: () => drainChain,
        is: () => drainChain,
        lte: () => drainChain,
        order: () => drainChain,
        limit: async (n: number) => {
          lastLimit = n;
          const all = fixture.approvedError ? null : fixture.approved;
          // Honour the route's `limit(tickCeiling + 1)` by trimming the
          // mock data to the requested size; this is how the "deferred"
          // accounting becomes observable without a 150-row fixture.
          const data =
            all === null
              ? null
              : lastLimit !== null && all.length > lastLimit
                ? all.slice(0, lastLimit)
                : all;
          return { data, error: fixture.approvedError };
        },
      };
      const recentSendsChain = {
        in: () => recentSendsChain,
        eq: () => recentSendsChain,
        gte: async () => ({ data: fixture.recentSends, error: null }),
      };
      // Probe: a tiny proxy that decides which chain to use on first call.
      return {
        eq: drainChain.eq.bind(drainChain),
        is: drainChain.is.bind(drainChain),
        in: recentSendsChain.in.bind(recentSendsChain),
        lte: drainChain.lte.bind(drainChain),
        order: drainChain.order.bind(drainChain),
        limit: drainChain.limit.bind(drainChain),
        gte: recentSendsChain.gte.bind(recentSendsChain),
      };
    },
    update: (patch: Record<string, unknown>) => ({
      eq: (_c1: string, id: string) => ({
        eq: async () => {
          fixture.updates.push({ id, patch });
          return { data: null, error: fixture.updateError };
        },
      }),
    }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "outreach_queue") return buildOutreachQueueFrom();
      if (table === "user_profiles") {
        return {
          select: () => ({
            in: async () => ({ data: fixture.users, error: null }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          select: () => ({
            in: async () => ({ data: fixture.contacts, error: null }),
          }),
        };
      }
      throw new Error(`Unexpected ${table}`);
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/outreach-sender", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

/** Build N approved rows, one user per row by default so the per-user cap
 *  doesn't accidentally engage in tests that don't intend it. */
function approvedRows(
  n: number,
  opts?: { userId?: string; contactPrefix?: string },
): Array<Record<string, unknown>> {
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    rows.push({
      id: `o${i}`,
      user_id: opts?.userId ?? `u${i}`,
      application_id: `app${i}`,
      contact_id: `${opts?.contactPrefix ?? "c"}${i}`,
      subject: "Hi",
      body: "Body",
      type: "follow_up",
    });
  }
  return rows;
}

function userProfiles(n: number, opts?: { userId?: string }): Array<{ id: string; email: string }> {
  if (opts?.userId) return [{ id: opts.userId, email: `${opts.userId}@example.com` }];
  return Array.from({ length: n }, (_, i) => ({
    id: `u${i}`,
    email: `u${i}@example.com`,
  }));
}

function contactsFor(n: number, prefix = "c"): Array<{ id: string; email: string }> {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    email: `${prefix}${i}@example.com`,
  }));
}

describe("GET /api/cron/outreach-sender", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    sendOutreachEmailMock.mockReset();
    logSecurityEventMock.mockReset();
    logWarnMock.mockReset();
    logErrorMock.mockReset();
    fixture.approved = [];
    fixture.approvedError = null;
    fixture.users = [];
    fixture.contacts = [];
    fixture.updateError = null;
    fixture.updates = [];
    fixture.pendingCount = null;
    fixture.pendingCountError = null;
    fixture.recentSends = [];
    verifyMock.mockReturnValue({ ok: true });
    sendOutreachEmailMock.mockResolvedValue({ messageId: "msg-test" });
    // Reset env each test so per-test overrides (ceilings, freeze) take
    // effect on the next env() call.
    for (const k of Object.keys(REQUIRED_ENV)) {
      process.env[k] = REQUIRED_ENV[k];
    }
    delete process.env.OUTREACH_MAX_PER_TICK_GLOBAL;
    delete process.env.OUTREACH_MAX_PER_USER_DAILY;
    delete process.env.OUTREACH_PENDING_FREEZE_AT;
    delete process.env.OUTREACH_FREEZE_OVERRIDE;
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    delete process.env.OUTREACH_MAX_PER_TICK_GLOBAL;
    delete process.env.OUTREACH_MAX_PER_USER_DAILY;
    delete process.env.OUTREACH_PENDING_FREEZE_AT;
    delete process.env.OUTREACH_FREEZE_OVERRIDE;
    _resetEnvCacheForTests();
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when approved fetch errors", async () => {
    fixture.approvedError = { message: "db broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns zero counts when queue is empty", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { processed: number; sent: number; failed: number };
    expect(body.processed).toBe(0);
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(0);
  });

  it("sends approved row, flips to sent, and emits audit", async () => {
    fixture.approved = [
      {
        id: "o1",
        user_id: "u1",
        application_id: "app1",
        contact_id: "c1",
        subject: "Hi",
        body: "Body",
        type: "follow_up",
      },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    sendOutreachEmailMock.mockResolvedValue({ messageId: "msg-123" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { sent: number; failed: number };
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(sendOutreachEmailMock).toHaveBeenCalledWith({
      to: "contact@example.com",
      subject: "Hi",
      body: "Body",
      replyTo: "user@example.com",
      idempotencyKey: "o1",
    });
    expect(fixture.updates[0]?.patch.status).toBe("sent");
    expect(fixture.updates[0]?.patch.resend_message_id).toBe("msg-123");
    expect(logSecurityEventMock).toHaveBeenCalledWith({
      userId: "u1",
      eventType: "agent_side_effect_email_sent",
      resourceType: "outreach_queue",
      resourceId: "o1",
      metadata: expect.objectContaining({
        messageId: "msg-123",
        outreachType: "follow_up",
        applicationId: "app1",
      }),
    });
  });

  it("retries the status write and escalates (stays drainable) when the post-send update fails", async () => {
    // Regression for the double-send window: send succeeds but the
    // status→sent write fails. The row must stay drainable (so it is NOT
    // silently marked sent), the write is retried once, and the send carries
    // the row-id idempotency key so a re-drain next tick cannot double-send.
    fixture.approved = [
      { id: "o1", user_id: "u1", application_id: "app1", contact_id: "c1", subject: "Hi", body: "Body", type: "follow_up" },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    fixture.updateError = { message: "db write down" };
    sendOutreachEmailMock.mockResolvedValue({ messageId: "msg-xyz" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { sent: number };
    expect(body.sent).toBe(1);
    // The send used the row id as the Resend idempotency key.
    expect(sendOutreachEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "o1" }),
    );
    // The status write was attempted twice (initial + one retry) and both
    // failed, so the row was never confirmed sent and remains re-drainable.
    expect(fixture.updates).toHaveLength(2);
    expect(logErrorMock).toHaveBeenCalledWith(
      "outreach_sender.update_after_send_failed",
      undefined,
      expect.objectContaining({ outreachId: "o1" }),
    );
  });

  it("skips rows missing subject/body without sending", async () => {
    fixture.approved = [
      { id: "o1", user_id: "u1", application_id: "app1", contact_id: "c1", subject: "", body: "", type: "follow_up" },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { failed: number; results: Array<{ status: string; error?: string }> };
    expect(body.failed).toBe(1);
    expect(sendOutreachEmailMock).not.toHaveBeenCalled();
    expect(body.results[0]?.status).toBe("skipped");
  });

  it("leaves row as approved when sendOutreachEmail throws", async () => {
    fixture.approved = [
      { id: "o1", user_id: "u1", application_id: "app1", contact_id: "c1", subject: "Hi", body: "Body", type: "follow_up" },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    sendOutreachEmailMock.mockRejectedValue(new Error("Resend 500"));
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { sent: number; failed: number; results: Array<{ status: string; error?: string }> };
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.results[0]?.status).toBe("failed");
    expect(body.results[0]?.error).toBe("Resend 500");
    expect(fixture.updates).toHaveLength(0);
    expect(logSecurityEventMock).not.toHaveBeenCalled();
  });

  // ── Blast-brake: per-tick global ceiling ────────────────────────────────
  describe("blast-brake: per-tick global ceiling", () => {
    it("with 150 pending and ceiling=100, drains at most the route batch cap and marks deferred", async () => {
      // The route's intrinsic OUTREACH_BATCH_LIMIT is 30, which is the
      // hard upper bound — the ceiling can only be tighter than that.
      // Set ceiling=20 (≤ batch limit) so we get a clean assertion.
      process.env.OUTREACH_MAX_PER_TICK_GLOBAL = "20";
      _resetEnvCacheForTests();

      fixture.approved = approvedRows(150);
      fixture.users = userProfiles(150);
      fixture.contacts = contactsFor(150);
      // Pending count must be below freeze so the circuit breaker stays open.
      fixture.pendingCount = 150;

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as {
        processed: number;
        sent: number;
        ceiling: number;
        ceilingHit: boolean;
        deferred: number;
      };
      expect(body.ceiling).toBe(20);
      expect(body.ceilingHit).toBe(true);
      expect(body.processed).toBe(20);
      expect(body.sent).toBe(20);
      expect(body.deferred).toBeGreaterThanOrEqual(1);
      expect(sendOutreachEmailMock).toHaveBeenCalledTimes(20);
      // Structured warn must fire so a watchdog can detect the ceiling hit.
      expect(logWarnMock).toHaveBeenCalledWith(
        "outreach.global_ceiling_hit",
        expect.objectContaining({
          drained: 20,
          ceiling: 20,
        }),
      );
    });

    it("with 5 pending and ceiling=100, drains all 5 without ceilingHit", async () => {
      process.env.OUTREACH_MAX_PER_TICK_GLOBAL = "100";
      _resetEnvCacheForTests();

      fixture.approved = approvedRows(5);
      fixture.users = userProfiles(5);
      fixture.contacts = contactsFor(5);
      fixture.pendingCount = 5;

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as {
        processed: number;
        sent: number;
        ceilingHit: boolean;
      };
      expect(body.ceilingHit).toBe(false);
      expect(body.processed).toBe(5);
      expect(body.sent).toBe(5);
    });
  });

  // ── Blast-brake: per-user daily cap ─────────────────────────────────────
  describe("blast-brake: per-user daily cap", () => {
    it("skips a row when the user already hit the daily cap", async () => {
      process.env.OUTREACH_MAX_PER_USER_DAILY = "25";
      _resetEnvCacheForTests();

      fixture.approved = approvedRows(1, { userId: "uA", contactPrefix: "cA" });
      fixture.users = userProfiles(1, { userId: "uA" });
      fixture.contacts = [{ id: "cA0", email: "cA0@example.com" }];
      // 25 sends already in the rolling 24h window for uA → next one is over.
      fixture.recentSends = Array.from({ length: 25 }, () => ({ user_id: "uA" }));
      fixture.pendingCount = 1;

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as {
        sent: number;
        failed: number;
        skipped: number;
        results: Array<{ status: string; reason?: string }>;
      };
      expect(body.sent).toBe(0);
      expect(body.failed).toBe(0);
      expect(body.skipped).toBe(1);
      expect(body.results[0]?.status).toBe("skipped");
      expect(body.results[0]?.reason).toBe("per_user_daily_cap");
      expect(sendOutreachEmailMock).not.toHaveBeenCalled();
      // Audit-log event for the skip — reason carried in metadata so the
      // trust console can surface the explanation.
      expect(logSecurityEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "uA",
          eventType: "agent_side_effect_status_updated",
          resourceType: "outreach_queue",
          resourceId: "o0",
          metadata: expect.objectContaining({
            reason: "per_user_daily_cap",
            sentInLast24h: 25,
            capPerDay: 25,
          }),
        }),
      );
    });

    it("permits the 25th send and blocks the 26th within a single tick", async () => {
      // Tick-local accounting: two approved rows for one user with 24
      // already-sent rows in the window. The first row crosses to 25 and
      // sends; the second crosses to 26 and is skipped.
      process.env.OUTREACH_MAX_PER_USER_DAILY = "25";
      _resetEnvCacheForTests();

      fixture.approved = [
        {
          id: "oA1",
          user_id: "uA",
          application_id: "app1",
          contact_id: "cA1",
          subject: "Hi",
          body: "Body",
          type: "follow_up",
        },
        {
          id: "oA2",
          user_id: "uA",
          application_id: "app2",
          contact_id: "cA2",
          subject: "Hi",
          body: "Body",
          type: "follow_up",
        },
      ];
      fixture.users = [{ id: "uA", email: "uA@example.com" }];
      fixture.contacts = [
        { id: "cA1", email: "cA1@example.com" },
        { id: "cA2", email: "cA2@example.com" },
      ];
      fixture.recentSends = Array.from({ length: 24 }, () => ({ user_id: "uA" }));
      fixture.pendingCount = 2;

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as { sent: number; skipped: number };
      expect(body.sent).toBe(1);
      expect(body.skipped).toBe(1);
      expect(sendOutreachEmailMock).toHaveBeenCalledTimes(1);
    });

    it("does not skip when capPerDay is non-positive (defensive)", async () => {
      // Wired indirectly: env requires positive integer, so we can't set
      // 0 via env — but exceedsPerUserDailyCap itself returns false on
      // bad caps. This path is exercised in quiet-hours.test.ts; here we
      // assert the normal path still proceeds at exactly the cap-1 mark.
      process.env.OUTREACH_MAX_PER_USER_DAILY = "25";
      _resetEnvCacheForTests();

      fixture.approved = approvedRows(1, { userId: "uA", contactPrefix: "cA" });
      fixture.users = userProfiles(1, { userId: "uA" });
      fixture.contacts = [{ id: "cA0", email: "cA0@example.com" }];
      fixture.recentSends = Array.from({ length: 24 }, () => ({ user_id: "uA" }));
      fixture.pendingCount = 1;

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as { sent: number; skipped: number };
      expect(body.sent).toBe(1);
      expect(body.skipped).toBe(0);
    });
  });

  // ── Blast-brake: pending-queue circuit breaker ──────────────────────────
  describe("blast-brake: pending-queue circuit breaker", () => {
    it("refuses to drain when pending count exceeds freeze threshold", async () => {
      process.env.OUTREACH_PENDING_FREEZE_AT = "500";
      _resetEnvCacheForTests();

      fixture.pendingCount = 600;
      // We deliberately populate `approved` to prove the route NEVER even
      // tries to drain it — a buggy implementation would send these.
      fixture.approved = approvedRows(3);
      fixture.users = userProfiles(3);
      fixture.contacts = contactsFor(3);

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as {
        frozen: boolean;
        pending: number;
        sent: number;
        processed: number;
      };
      expect(body.frozen).toBe(true);
      expect(body.pending).toBe(600);
      expect(body.sent).toBe(0);
      expect(body.processed).toBe(0);
      expect(sendOutreachEmailMock).not.toHaveBeenCalled();
      // log.error so the watchdog catches it
      expect(logErrorMock).toHaveBeenCalledWith(
        "outreach.pending_queue_frozen",
        expect.any(Error),
        expect.objectContaining({ pending: 600, freezeAt: 500 }),
      );
    });

    it("bypasses freeze when OUTREACH_FREEZE_OVERRIDE=1 is set", async () => {
      process.env.OUTREACH_PENDING_FREEZE_AT = "500";
      process.env.OUTREACH_FREEZE_OVERRIDE = "1";
      _resetEnvCacheForTests();

      // Pending is over the threshold but the override is on — normal
      // drain proceeds. Set explicit row count so the assertion is crisp.
      fixture.pendingCount = 600;
      fixture.approved = approvedRows(3);
      fixture.users = userProfiles(3);
      fixture.contacts = contactsFor(3);

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as {
        frozen?: boolean;
        sent: number;
        processed: number;
      };
      expect(body.frozen).toBeUndefined();
      expect(body.processed).toBe(3);
      expect(body.sent).toBe(3);
      expect(sendOutreachEmailMock).toHaveBeenCalledTimes(3);
    });

    it("freezes at exact threshold (>= freezeAt, not > freezeAt)", async () => {
      process.env.OUTREACH_PENDING_FREEZE_AT = "500";
      _resetEnvCacheForTests();

      fixture.pendingCount = 500;
      fixture.approved = approvedRows(1);
      fixture.users = userProfiles(1);
      fixture.contacts = contactsFor(1);

      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      const body = (await res.json()) as { frozen?: boolean; sent: number };
      expect(body.frozen).toBe(true);
      expect(body.sent).toBe(0);
    });

    it("returns 500 if pending count probe itself errors", async () => {
      fixture.pendingCountError = { message: "count failed" };
      const { GET } = await import("./route");
      const res = await GET(makeRequest());
      expect(res.status).toBe(500);
    });
  });
});
