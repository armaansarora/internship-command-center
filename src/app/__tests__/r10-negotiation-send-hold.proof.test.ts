/**
 * R10.10 PROOF — 24h server-clamped send-hold for negotiation outreach.
 *
 * Partner non-negotiable: negotiation emails get a 24-hour minimum send-hold,
 * clamped server-side. A hand-crafted POST cannot bypass this because:
 *   (a) the clamp is a SERVER-SIDE read of the queued row's `type` column,
 *       not a request-body parameter;
 *   (b) `approveOutreachForUser` itself enforces
 *       `send_after >= now() + minimumHoldSeconds`, so every code path that
 *       uses the helper is clamped, not just the /approve route.
 *
 * These tests lock that contract at two layers:
 *   1. Helper layer — opts.minimumHoldSeconds=86400 writes send_after at
 *      least 24h in the future, regardless of the caller's `sendAfter` arg.
 *   2. Route layer — POST /api/outreach/approve auto-clamps when the queued
 *      row's `type === 'negotiation'`, and preserves the 30s UNDO_WINDOW
 *      for every other type (regression).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { approveOutreachForUser } from "@/lib/db/queries/outreach-mutations";

// ---------------------------------------------------------------------------
// Mocks for the route-level tests. The route now does TWO supabase calls:
//   1. .from("outreach_queue").select("type").eq(...).eq(...).eq(...).maybeSingle()
//   2. The helper's .from("outreach_queue").update({...}).eq(...).eq(...).eq(...).select(...).single()
// We use a single `sbMock.from` whose implementation returns a different
// chain depending on which call site (select-only vs update) is invoking it.
// ---------------------------------------------------------------------------

const USER_ID = "11111111-1111-4111-8111-111111111111";

const requireUserMock = vi.hoisted(() =>
  vi.fn(async () => ({ id: USER_ID })),
);
const sbMock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserMock,
  createClient: vi.fn(async () => sbMock),
}));

interface SelectChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

interface UpdateChain {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

function mkSelectChain(result: {
  data: unknown;
  error: unknown;
}): SelectChain {
  const chain: SelectChain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

function mkUpdateChain(result: {
  data: unknown;
  error: unknown;
}): UpdateChain {
  const chain: UpdateChain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

async function callPost(body: unknown): Promise<Response> {
  const { POST } = await import("@/app/api/outreach/approve/route");
  const req = new NextRequest("http://localhost/api/outreach/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

// ---------------------------------------------------------------------------
// Helper-level mock: just capture the .update() patch so we can inspect the
// written send_after. The helper chains .from().update().eq().eq().eq()
// .select().single() — one chain call per test is enough.
// ---------------------------------------------------------------------------

interface HelperClientHandle {
  client: unknown;
  patches: Array<Record<string, unknown>>;
}

function mkHelperClient(result: {
  data: unknown;
  error: unknown;
}): HelperClientHandle {
  const patches: Array<Record<string, unknown>> = [];
  const chain = {
    update: vi.fn((patch: Record<string, unknown>) => {
      patches.push(patch);
      return chain;
    }),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  const client = { from: vi.fn(() => chain) };
  return { client, patches };
}

describe("R10.10 — 24h negotiation send-hold (server-clamped)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Layer 1: helper-level clamp contract.
  // -------------------------------------------------------------------------
  it("approveOutreachForUser with minimumHoldSeconds=86400 sets send_after >= 24h, even if caller passes now()+30s", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const { client, patches } = mkHelperClient({
      data: {
        id: rowId,
        send_after: new Date(Date.now() + 86400 * 1000).toISOString(),
      },
      error: null,
    });

    const before = Date.now();
    // Caller tries to stamp only 30s hold — the clamp MUST override.
    const sendAfterArg = new Date(before + 30 * 1000);
    const result = await approveOutreachForUser(
      client as never,
      USER_ID,
      rowId,
      sendAfterArg,
      { minimumHoldSeconds: 86400 },
    );

    expect(result).not.toBeNull();
    expect(patches.length).toBe(1);
    const writtenSendAfter = Date.parse(patches[0]!.send_after as string);
    // Must be clamped to at least 24h from `before`. Allow 2s slack for clock drift
    // between Date.now() calls in the test and in the helper, and a generous
    // upper bound to tolerate slow CI (100ms jitter is fine).
    expect(writtenSendAfter - before).toBeGreaterThanOrEqual(
      86400 * 1000 - 2000,
    );
    expect(writtenSendAfter - before).toBeLessThan(86400 * 1000 + 10_000);
  });

  it("approveOutreachForUser WITHOUT minimumHoldSeconds preserves caller's sendAfter (regression)", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const caller30sIso = new Date(Date.now() + 30 * 1000).toISOString();
    const { client, patches } = mkHelperClient({
      data: { id: rowId, send_after: caller30sIso },
      error: null,
    });

    const before = Date.now();
    const sendAfterArg = new Date(before + 30 * 1000);
    await approveOutreachForUser(
      client as never,
      USER_ID,
      rowId,
      sendAfterArg,
    );

    expect(patches.length).toBe(1);
    const writtenSendAfter = Date.parse(patches[0]!.send_after as string);
    // No clamp → written send_after ~= caller's sendAfter (30s in future).
    expect(writtenSendAfter - before).toBeGreaterThanOrEqual(29_000);
    expect(writtenSendAfter - before).toBeLessThanOrEqual(31_000);
  });

  it("approveOutreachForUser returns null when no pending_approval row matches (404 semantics)", async () => {
    const { client } = mkHelperClient({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    const result = await approveOutreachForUser(
      client as never,
      USER_ID,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Layer 2: route-level auto-clamp by queued row.type.
  // -------------------------------------------------------------------------
  it("route /api/outreach/approve auto-clamps when queued row.type === 'negotiation'", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const selectChain = mkSelectChain({
      data: { type: "negotiation" },
      error: null,
    });
    const futureIso = new Date(Date.now() + 86400 * 1000).toISOString();
    const updateChain = mkUpdateChain({
      data: { id: rowId, send_after: futureIso },
      error: null,
    });

    // First .from() call is the SELECT; second is the UPDATE inside the helper.
    let call = 0;
    sbMock.from.mockImplementation(() => {
      call += 1;
      return call === 1 ? selectChain : updateChain;
    });

    const before = Date.now();
    const res = await callPost({ id: rowId });
    expect(res.status).toBe(200);

    // The update payload's send_after must be at least 24h in the future.
    expect(updateChain.update).toHaveBeenCalledOnce();
    const payload = updateChain.update.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const writtenSendAfter = Date.parse(payload.send_after as string);
    expect(writtenSendAfter - before).toBeGreaterThanOrEqual(
      86400 * 1000 - 2000,
    );
    expect(writtenSendAfter - before).toBeLessThan(86400 * 1000 + 10_000);

    // Still filtered by pending_approval at write time.
    expect(updateChain.eq).toHaveBeenCalledWith("status", "pending_approval");
  });

  it("route /api/outreach/approve uses 30s UNDO_WINDOW when row.type !== 'negotiation' (regression)", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const selectChain = mkSelectChain({
      data: { type: "cold_email" },
      error: null,
    });
    const thirtyIso = new Date(Date.now() + 30 * 1000).toISOString();
    const updateChain = mkUpdateChain({
      data: { id: rowId, send_after: thirtyIso },
      error: null,
    });

    let call = 0;
    sbMock.from.mockImplementation(() => {
      call += 1;
      return call === 1 ? selectChain : updateChain;
    });

    const before = Date.now();
    const res = await callPost({ id: rowId });
    expect(res.status).toBe(200);

    const payload = updateChain.update.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const writtenSendAfter = Date.parse(payload.send_after as string);
    // Non-negotiation rows keep the 30s undo-window behavior.
    expect(writtenSendAfter - before).toBeGreaterThanOrEqual(29_000);
    expect(writtenSendAfter - before).toBeLessThanOrEqual(31_000);
  });

  it("route /api/outreach/approve returns 404 when initial type lookup misses", async () => {
    const selectChain = mkSelectChain({ data: null, error: null });
    sbMock.from.mockImplementation(() => selectChain);

    const res = await callPost({
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(404);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("not_found");
  });
});
