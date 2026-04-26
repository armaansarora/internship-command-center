/**
 * R10.10 — POST /api/outreach/approve contract tests.
 *
 * Locks the undo-window semantics at the route boundary:
 *   - 400 on malformed body
 *   - 404 when no pending_approval row matches (wrong user, already sent, etc.)
 *   - 200 happy-path: stamps status='approved', approved_at, and
 *     send_after = now()+30s so the cron won't pick it up inside the
 *     undo window.
 *   - R10.10: when queued row.type === 'negotiation', the clamp writes
 *     send_after >= 24h from now. Covered end-to-end in
 *     src/app/__tests__/r10-negotiation-send-hold.proof.test.ts.
 *
 * Mutual exclusion with /api/outreach/undo is enforced by the database
 * (cron predicate send_after <= now, undo predicate send_after > now) —
 * these tests assert the route writes the timestamp correctly; the
 * P1 proof in src/app/__tests__/r7-undo-proof.test.ts locks the race.
 *
 * R10.10 refactored the route to do TWO supabase calls — a SELECT on
 * `type` followed by the helper's UPDATE — so the mock provides one
 * chain for each stage, toggled by call count.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireUserMock = vi.hoisted(() =>
  vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
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

function mkSelectChain(
  result: { data: unknown; error: unknown },
): SelectChain {
  const chain: SelectChain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

function mkUpdateChain(
  result: { data: unknown; error: unknown },
): UpdateChain {
  const chain: UpdateChain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

/**
 * Wires `sbMock.from` so the first call returns the SELECT chain (the
 * route's type lookup) and the second call returns the UPDATE chain (the
 * helper's write). Returns both chains so the test can assert on either.
 */
function wireChains(
  selectResult: { data: unknown; error: unknown },
  updateResult: { data: unknown; error: unknown },
): { selectChain: SelectChain; updateChain: UpdateChain } {
  const selectChain = mkSelectChain(selectResult);
  const updateChain = mkUpdateChain(updateResult);
  let call = 0;
  sbMock.from.mockImplementation(() => {
    call += 1;
    return call === 1 ? selectChain : updateChain;
  });
  return { selectChain, updateChain };
}

async function callPost(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/outreach/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/outreach/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400 when body is missing id", async () => {
    // No chain needed — the route short-circuits before hitting supabase.
    sbMock.from.mockImplementation(() =>
      mkSelectChain({ data: null, error: null }),
    );
    const res = await callPost({});
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("bad_request");
  });

  it("400 when id is not a uuid", async () => {
    sbMock.from.mockImplementation(() =>
      mkSelectChain({ data: null, error: null }),
    );
    const res = await callPost({ id: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("404 when no pending_approval row matches the type lookup", async () => {
    // The initial SELECT returns null — route must 404 before touching UPDATE.
    const selectChain = mkSelectChain({ data: null, error: null });
    sbMock.from.mockImplementation(() => selectChain);
    const res = await callPost({
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(404);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("not_found");
  });

  it("404 when type lookup succeeds but the UPDATE misses (TOCTOU)", async () => {
    // e.g. row got approved between the two calls.
    const { updateChain } = wireChains(
      { data: { type: "cold_email" }, error: null },
      { data: null, error: { code: "PGRST116", message: "not found" } },
    );
    const res = await callPost({
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(404);
    // The helper did try to update — this isn't a short-circuit.
    expect(updateChain.update).toHaveBeenCalledOnce();
  });

  it("200 stamps send_after ~30s in the future for non-negotiation rows", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const futureIso = new Date(Date.now() + 30_000).toISOString();
    const { updateChain } = wireChains(
      { data: { type: "cold_email" }, error: null },
      { data: { id: rowId, send_after: futureIso }, error: null },
    );

    const res = await callPost({ id: rowId });
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      ok: boolean;
      id: string;
      sendAfter: string;
    };
    expect(j.ok).toBe(true);
    expect(j.id).toBe(rowId);
    expect(j.sendAfter).toBe(futureIso);

    // The update payload must stamp status, approved_at, send_after, cancelled_at.
    expect(updateChain.update).toHaveBeenCalledOnce();
    const payload = updateChain.update.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(payload.status).toBe("approved");
    expect(typeof payload.approved_at).toBe("string");
    expect(typeof payload.send_after).toBe("string");
    expect(payload.cancelled_at).toBeNull();

    // send_after must be ~30s in the future (allow 1s slack for execution time).
    const sendAfterMs = Date.parse(payload.send_after as string);
    const now = Date.now();
    expect(sendAfterMs - now).toBeGreaterThanOrEqual(29_000);
    expect(sendAfterMs - now).toBeLessThanOrEqual(31_000);

    // The row must be scoped by user_id and status='pending_approval'.
    expect(updateChain.eq).toHaveBeenCalledWith("id", rowId);
    expect(updateChain.eq).toHaveBeenCalledWith(
      "user_id",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(updateChain.eq).toHaveBeenCalledWith("status", "pending_approval");
  });

  it("200 stamps send_after >= 24h in the future when row.type === 'negotiation'", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const futureIso = new Date(Date.now() + 86_400_000).toISOString();
    const { updateChain } = wireChains(
      { data: { type: "negotiation" }, error: null },
      { data: { id: rowId, send_after: futureIso }, error: null },
    );

    const before = Date.now();
    const res = await callPost({ id: rowId });
    expect(res.status).toBe(200);

    const payload = updateChain.update.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const sendAfterMs = Date.parse(payload.send_after as string);
    // Clamped to at least 24h - 2s slack.
    expect(sendAfterMs - before).toBeGreaterThanOrEqual(86_400_000 - 2000);
    expect(sendAfterMs - before).toBeLessThan(86_400_000 + 10_000);
  });

  it("type=reference_request also gets 24h send-hold clamp", async () => {
    const { selectChain: _s, updateChain: _u } = wireChains(
      { data: { type: "reference_request" }, error: null },
      {
        data: {
          id: "ref-1",
          send_after: new Date(Date.now() + 86400 * 1000).toISOString(),
        },
        error: null,
      },
    );
    const req = new NextRequest("http://localhost/api/outreach/approve", {
      method: "POST",
      body: JSON.stringify({ id: "11111111-1111-4111-8111-111111111111" }),
      headers: { "content-type": "application/json" },
    });
    const { POST } = await import("./route");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const sendAfter = new Date(body.sendAfter).getTime();
    expect(sendAfter - Date.now()).toBeGreaterThan(23.5 * 3600 * 1000);
  });
});
