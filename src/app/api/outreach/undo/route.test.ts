/**
 * R7.2 — POST /api/outreach/undo contract tests.
 *
 * Locks the load-bearing predicate: send_after > now(). If a future change
 * strips this filter, an undo clicked after the cron already fired would
 * corrupt state. 409 too_late is the only correct answer in that race.
 *
 *   - 400 on malformed body
 *   - 409 when send_after <= now() (cron already picked the row up, or
 *     the row is not in approved status)
 *   - 200 happy-path: flips status back to 'pending_approval',
 *     clears approved_at, stamps cancelled_at.
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
  gt: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

function mkUpdateChain(
  result: { data: unknown; error: unknown },
): UpdateChain {
  const chain: UpdateChain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

async function callPost(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/outreach/undo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/outreach/undo", () => {
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

  it("409 when send_after <= now() (cron already grabbed the row)", async () => {
    // PGRST116 is Supabase REST's "row not found" after an update with
    // a predicate that matches nothing — the exact signal the send_after>now
    // predicate gives when the undo window has expired.
    const chain = mkUpdateChain({
      data: null,
      error: { code: "PGRST116", message: "no rows affected" },
    });
    sbMock.from.mockImplementation(() => chain);

    const res = await callPost({
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(409);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("too_late");
  });

  it("200 flips back to pending_approval and stamps cancelled_at", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    const chain = mkUpdateChain({
      data: { id: rowId },
      error: null,
    });
    sbMock.from.mockImplementation(() => chain);

    const res = await callPost({ id: rowId });
    expect(res.status).toBe(200);
    const j = (await res.json()) as { ok: boolean; id: string };
    expect(j.ok).toBe(true);
    expect(j.id).toBe(rowId);

    // Payload must revert status + clear approved_at + stamp cancelled_at.
    expect(chain.update).toHaveBeenCalledOnce();
    const payload = chain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.status).toBe("pending_approval");
    expect(payload.approved_at).toBeNull();
    expect(typeof payload.cancelled_at).toBe("string");

    // Scoping: id, user_id, status='approved'. And the load-bearing .gt on send_after.
    expect(chain.eq).toHaveBeenCalledWith("id", rowId);
    expect(chain.eq).toHaveBeenCalledWith(
      "user_id",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(chain.eq).toHaveBeenCalledWith("status", "approved");
    expect(chain.gt).toHaveBeenCalledOnce();
    const gtArgs = chain.gt.mock.calls[0];
    expect(gtArgs?.[0]).toBe("send_after");
    expect(typeof gtArgs?.[1]).toBe("string");
  });
});
