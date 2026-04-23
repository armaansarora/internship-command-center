/**
 * R7.2 — POST /api/outreach/approve contract tests.
 *
 * Locks the undo-window semantics at the route boundary:
 *   - 400 on malformed body
 *   - 404 when no pending_approval row matches (wrong user, already sent, etc.)
 *   - 200 happy-path: stamps status='approved', approved_at, and
 *     send_after = now()+30s so the cron won't pick it up inside the
 *     undo window.
 *
 * Mutual exclusion with /api/outreach/undo is enforced by the database
 * (cron predicate send_after <= now, undo predicate send_after > now) —
 * these tests assert the route writes the timestamp correctly; the
 * P1 proof in src/app/__tests__/r7-undo-proof.test.ts locks the race.
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

interface UpdateChain {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
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
    sbMock.from.mockImplementation(() =>
      mkUpdateChain({ data: null, error: null }),
    );
    const res = await callPost({});
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("bad_request");
  });

  it("400 when id is not a uuid", async () => {
    sbMock.from.mockImplementation(() =>
      mkUpdateChain({ data: null, error: null }),
    );
    const res = await callPost({ id: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("404 when no pending_approval row matches", async () => {
    const chain = mkUpdateChain({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    sbMock.from.mockImplementation(() => chain);
    const res = await callPost({
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(404);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("not_found");
  });

  it("200 stamps send_after ~30s in the future", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const futureIso = new Date(Date.now() + 30_000).toISOString();
    const chain = mkUpdateChain({
      data: { id: rowId, send_after: futureIso },
      error: null,
    });
    sbMock.from.mockImplementation(() => chain);

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
    expect(chain.update).toHaveBeenCalledOnce();
    const payload = chain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.status).toBe("approved");
    expect(typeof payload.approved_at).toBe("string");
    expect(typeof payload.send_after).toBe("string");
    expect(payload.cancelled_at).toBeNull();

    // send_after must be >= 29s in the future (allow 1s slack for execution time).
    const sendAfterMs = Date.parse(payload.send_after as string);
    const now = Date.now();
    expect(sendAfterMs - now).toBeGreaterThanOrEqual(29_000);
    expect(sendAfterMs - now).toBeLessThanOrEqual(31_000);

    // The row must be scoped by user_id and status='pending_approval'.
    expect(chain.eq).toHaveBeenCalledWith("id", rowId);
    expect(chain.eq).toHaveBeenCalledWith(
      "user_id",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(chain.eq).toHaveBeenCalledWith("status", "pending_approval");
  });
});
