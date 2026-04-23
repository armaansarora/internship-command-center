import { describe, it, expect, vi } from "vitest";
import { approveOutreachWithUndo } from "./approveOutreachWithUndo";

describe("approveOutreachWithUndo", () => {
  it("POSTs to /api/outreach/approve with the given id", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          id: "11111111-1111-4111-8111-111111111111",
          sendAfter: "2026-04-23T12:00:30.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await approveOutreachWithUndo(
      "11111111-1111-4111-8111-111111111111",
      fetchMock as unknown as typeof fetch,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/outreach/approve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: "11111111-1111-4111-8111-111111111111" }),
      }),
    );
    expect(result.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.sendAfterIso).toBe("2026-04-23T12:00:30.000Z");
  });

  it("throws with server error body on non-OK", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
    );
    await expect(
      approveOutreachWithUndo(
        "22222222-2222-4222-8222-222222222222",
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/not_found/);
  });

  it("throws generic error on malformed server response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("<html>502</html>", { status: 502 }),
    );
    await expect(
      approveOutreachWithUndo(
        "33333333-3333-4333-8333-333333333333",
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/approve_failed_502/);
  });
});
