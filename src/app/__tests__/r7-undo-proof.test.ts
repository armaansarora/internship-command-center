/**
 * R7 P1 PROOF — Real-undo, DB-level send_after guard.
 *
 * The non-negotiable partner constraint: within the 30s window, a clicked
 * cancel MUST physically prevent Resend from firing. A UI-only countdown
 * that hides an already-sent email is the failure mode this test exists
 * to defeat.
 *
 * The proof runs the actual route handlers (approve, undo, cron) against
 * a single in-memory outreach_queue row with a fake clock:
 *
 *   t = 0s   → POST /api/outreach/approve
 *              (stamps status='approved', send_after = 30s)
 *   t = 29s  → POST /api/outreach/undo
 *              (predicate send_after > now matches; row flips back to
 *              'pending_approval' and cancelled_at is stamped)
 *   t = 40s  → GET /api/cron/outreach-sender
 *              (predicate status='approved' AND send_after <= now; the
 *              row is no longer approved and is invisible to the cron)
 *
 * Assertions:
 *   - Resend.send was called 0 times.
 *   - Row status is 'pending_approval'.
 *   - Row cancelled_at is stamped (non-null).
 *
 * Mutual exclusion between undo and cron is enforced by the database,
 * not by UI sequencing. Postgres decides the race via timestamp
 * comparison; this test locks that contract.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

// ---------------------------------------------------------------------------
// In-memory row that the three route handlers share via mocked supabase
// clients. Mutations happen through the same chainable API the real routes
// use, so the test exercises the actual predicate ordering.
// ---------------------------------------------------------------------------

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "22222222-2222-4222-8222-222222222222";

interface OutreachRow {
  id: string;
  user_id: string;
  application_id: string | null;
  contact_id: string | null;
  subject: string | null;
  body: string | null;
  type: string | null;
  status: "pending_approval" | "approved" | "sent" | "rejected" | "expired";
  approved_at: string | null;
  send_after: string | null;
  sent_at: string | null;
  resend_message_id: string | null;
  cancelled_at: string | null;
}

const row: OutreachRow = {
  id: ROW_ID,
  user_id: USER_ID,
  application_id: null,
  contact_id: "33333333-3333-4333-8333-333333333333",
  subject: "hello",
  body: "body text",
  type: "cold_email",
  status: "pending_approval",
  approved_at: null,
  send_after: null,
  sent_at: null,
  resend_message_id: null,
  cancelled_at: null,
};

// A chainable that simulates the minimum surface the three route handlers touch.
// Supports: .update(patch).eq(col,val).[gt(col,val)].select(...).single() and
//           .select(...).eq.is.lte.order.limit → {data:[],error:null}
// For the cron SELECT path we evaluate the predicate set against the in-memory row
// and return [row] iff it still matches, else [].
interface MutFilter {
  kind: "eq" | "gt" | "lte" | "is";
  col: string;
  val: unknown;
}

function userAuthClient() {
  return {
    from(table: string) {
      if (table !== "outreach_queue") throw new Error(`unexpected table ${table}`);
      const filters: MutFilter[] = [];
      let pendingPatch: Partial<OutreachRow> | null = null;
      const api = {
        update(patch: Partial<OutreachRow>) {
          pendingPatch = patch;
          return api;
        },
        eq(col: string, val: unknown) {
          filters.push({ kind: "eq", col, val });
          return api;
        },
        gt(col: string, val: unknown) {
          filters.push({ kind: "gt", col, val });
          return api;
        },
        select() {
          return api;
        },
        async single() {
          const ok = matches(row, filters);
          if (!ok || !pendingPatch) {
            return {
              data: null,
              error: { code: "PGRST116", message: "no rows" },
            };
          }
          Object.assign(row, pendingPatch);
          return {
            data: {
              id: row.id,
              send_after: row.send_after,
            },
            error: null,
          };
        },
      };
      return api;
    },
  };
}

function matches(r: OutreachRow, filters: MutFilter[]): boolean {
  for (const f of filters) {
    const v = (r as unknown as Record<string, unknown>)[f.col];
    if (f.kind === "eq" && v !== f.val) return false;
    if (f.kind === "gt") {
      if (typeof v !== "string" || typeof f.val !== "string") return false;
      if (!(Date.parse(v) > Date.parse(f.val))) return false;
    }
    if (f.kind === "lte") {
      if (typeof v !== "string" || typeof f.val !== "string") return false;
      if (!(Date.parse(v) <= Date.parse(f.val))) return false;
    }
    if (f.kind === "is" && v !== f.val) return false;
  }
  return true;
}

// The cron uses:
//   - select+eq+is+lte+order+limit returning {data: [row|empty], error: null}
//   - update+eq+eq awaited -> {error: null | {message}}
// .from() returns a fresh stateless chain so multiple cron invocations
// in one test don't cross-pollinate filter state.
function adminCronClient() {
  return {
    from(table: string) {
      if (table === "outreach_queue") {
        // The SELECT chain and UPDATE chain are distinct, both triggered
        // from the same top-level .from() object.
        const selectFilters: MutFilter[] = [];

        function makeUpdateAwaitable(
          patch: Partial<OutreachRow>,
          fs: MutFilter[],
        ): PromiseLike<{ error: null | { message: string } }> {
          const resolve = (): { error: null | { message: string } } => {
            const ok = matches(row, fs);
            if (ok) Object.assign(row, patch);
            return { error: ok ? null : { message: "no match" } };
          };
          return {
            then(onFulfilled, onRejected) {
              try {
                const value = resolve();
                return Promise.resolve(value).then(
                  onFulfilled as never,
                  onRejected as never,
                );
              } catch (err) {
                return Promise.reject(err).then(
                  onFulfilled as never,
                  onRejected as never,
                );
              }
            },
          };
        }

        function makeUpdateChain(
          patch: Partial<OutreachRow>,
          fs: MutFilter[],
        ): {
          eq: (c: string, v: unknown) => ReturnType<typeof makeUpdateChain> &
            PromiseLike<{ error: null | { message: string } }>;
        } & PromiseLike<{ error: null | { message: string } }> {
          const awaitable = makeUpdateAwaitable(patch, fs);
          return {
            eq(c: string, v: unknown) {
              fs.push({ kind: "eq", col: c, val: v });
              return makeUpdateChain(patch, fs) as ReturnType<
                typeof makeUpdateChain
              > &
                PromiseLike<{ error: null | { message: string } }>;
            },
            then: awaitable.then,
          };
        }

        const chain = {
          select() {
            return chain;
          },
          eq(col: string, val: unknown) {
            selectFilters.push({ kind: "eq", col, val });
            return chain;
          },
          is(col: string, val: unknown) {
            selectFilters.push({ kind: "is", col, val });
            return chain;
          },
          lte(col: string, val: unknown) {
            selectFilters.push({ kind: "lte", col, val });
            return chain;
          },
          order() {
            return chain;
          },
          async limit() {
            const data = matches(row, selectFilters) ? [row] : [];
            return { data, error: null };
          },
          update(patch: Partial<OutreachRow>) {
            const fs: MutFilter[] = [];
            return makeUpdateChain(patch, fs);
          },
        };
        return chain;
      }
      if (table === "user_profiles") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [{ id: USER_ID, email: "me@t.co" }], error: null }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: row.contact_id, email: "them@t.co" }],
                error: null,
              }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

// ---------------------------------------------------------------------------
// Mocks — supabase clients, env, Resend, cron auth, logger, audit.
// ---------------------------------------------------------------------------

const resendSendMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: USER_ID, email: "me@t.co" })),
  createClient: vi.fn(async () => userAuthClient()),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => adminCronClient(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: resendSendMock,
    };
  },
}));

vi.mock("@/lib/auth/cron", () => ({
  verifyCronRequest: () => ({ ok: true }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: vi.fn(async () => undefined),
}));

// ---------------------------------------------------------------------------
// The proof.
// ---------------------------------------------------------------------------

describe("R7 P1 proof — undo within window physically prevents Resend", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalResend = process.env.RESEND_API_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-pub-key";
    process.env.RESEND_API_KEY = "re_test_key";
    _resetEnvCacheForTests();
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
    if (originalResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResend;
    _resetEnvCacheForTests();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T12:00:00.000Z"));
    // Reset the in-memory row to a fresh pending_approval.
    row.status = "pending_approval";
    row.approved_at = null;
    row.send_after = null;
    row.sent_at = null;
    row.resend_message_id = null;
    row.cancelled_at = null;
    resendSendMock.mockReset();
    resendSendMock.mockResolvedValue({
      data: { id: "resend-msg-id" },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("approve → undo at t+29s → advance to t+40s → cron sends 0 emails", async () => {
    const { POST: approvePost } = await import(
      "@/app/api/outreach/approve/route"
    );
    const { POST: undoPost } = await import("@/app/api/outreach/undo/route");
    const { GET: cronGet } = await import(
      "@/app/api/cron/outreach-sender/route"
    );

    // t = 0 — approve.
    const approveRes = await approvePost(
      new NextRequest("http://localhost/api/outreach/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: ROW_ID }),
      }),
    );
    expect(approveRes.status).toBe(200);
    expect(row.status).toBe("approved");
    expect(row.send_after).not.toBeNull();
    // send_after must be ~30s in the future.
    expect(Date.parse(row.send_after!) - Date.now()).toBeGreaterThanOrEqual(
      30_000 - 50,
    );

    // t = 29 — undo. Still strictly inside the window (send_after > now).
    vi.advanceTimersByTime(29_000);
    const undoRes = await undoPost(
      new NextRequest("http://localhost/api/outreach/undo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: ROW_ID }),
      }),
    );
    expect(undoRes.status).toBe(200);
    expect(row.status).toBe("pending_approval");
    expect(row.cancelled_at).not.toBeNull();

    // t = 40 — advance past the original send_after. The cron is now eligible
    // to run, but the row is no longer 'approved' — so it's invisible.
    vi.advanceTimersByTime(11_000);
    const cronRes = await cronGet(
      new NextRequest("http://localhost/api/cron/outreach-sender", {
        method: "GET",
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(cronRes.status).toBe(200);
    const body = (await cronRes.json()) as { sent: number; processed: number };
    expect(body.processed).toBe(0);
    expect(body.sent).toBe(0);

    // The load-bearing assertion: Resend.send was never invoked.
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(row.sent_at).toBeNull();
    expect(row.resend_message_id).toBeNull();
  });

  it("without undo: row becomes eligible at t+30s and cron sends exactly once", async () => {
    // Mirror test — confirms the window actually opens. If this fails, the
    // approve route is writing send_after wrong and the first test would
    // pass trivially.
    const { POST: approvePost } = await import(
      "@/app/api/outreach/approve/route"
    );
    const { GET: cronGet } = await import(
      "@/app/api/cron/outreach-sender/route"
    );

    const approveRes = await approvePost(
      new NextRequest("http://localhost/api/outreach/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: ROW_ID }),
      }),
    );
    expect(approveRes.status).toBe(200);
    expect(row.status).toBe("approved");
    expect(row.send_after).not.toBeNull();

    // Cron at t=15s sees nothing — send_after (t+30) > now (t+15).
    vi.advanceTimersByTime(15_000);
    let cronRes = await cronGet(
      new NextRequest("http://localhost/api/cron/outreach-sender", {
        method: "GET",
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    let body = (await cronRes.json()) as { sent: number; processed: number };
    expect(body.sent).toBe(0);
    expect(resendSendMock).not.toHaveBeenCalled();

    // Advance past the window and cron fires.
    vi.advanceTimersByTime(20_000);
    cronRes = await cronGet(
      new NextRequest("http://localhost/api/cron/outreach-sender", {
        method: "GET",
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    body = (await cronRes.json()) as { sent: number; processed: number };
    expect(body.sent).toBe(1);
    expect(resendSendMock).toHaveBeenCalledOnce();
  });
});
