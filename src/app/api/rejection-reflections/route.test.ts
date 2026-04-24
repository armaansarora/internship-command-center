import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * R9.6 — POST /api/rejection-reflections contract tests.
 *
 * Invariants:
 *   - 401 when unauthenticated (never touches the create query).
 *   - 400 when body fails Zod validation.
 *   - 201 on successful insert.
 *   - 500 on DB error from the create query.
 */

const { requireUserSpy, createSpy } = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  createSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/db/queries/rejection-reflections-rest", () => ({
  createRejectionReflection: createSpy,
}));

const { POST } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-abc", email: "owner@example.com" },
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/rejection-reflections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  requireUserSpy.mockReset();
  createSpy.mockReset();
});

describe("POST /api/rejection-reflections", () => {
  it("returns 401 when unauthenticated and never calls the query", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(
      makeRequest({
        applicationId: "11111111-1111-4111-8111-111111111111",
        reasons: [],
      }),
    );

    expect(res.status).toBe(401);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body fails validation (no applicationId)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(makeRequest({ reasons: [] }));

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when applicationId is not a uuid", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makeRequest({ applicationId: "not-a-uuid", reasons: [] }),
    );

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when reasons is missing", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makeRequest({ applicationId: "11111111-1111-4111-8111-111111111111" }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when body isn't valid JSON", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const req = new Request("http://localhost/api/rejection-reflections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("returns 201 on successful insert", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    createSpy.mockResolvedValue({ success: true, id: "new-id" });

    const res = await POST(
      makeRequest({
        applicationId: "11111111-1111-4111-8111-111111111111",
        reasons: ["No response"],
        freeText: "ghosted",
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; id?: string };
    expect(body.success).toBe(true);
    expect(body.id).toBe("new-id");

    expect(createSpy).toHaveBeenCalledTimes(1);
    const call = createSpy.mock.calls[0][0] as {
      userId: string;
      applicationId: string;
      reasons: string[];
      freeText?: string | null;
    };
    expect(call.userId).toBe("user-abc");
    expect(call.applicationId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(call.reasons).toEqual(["No response"]);
    expect(call.freeText).toBe("ghosted");
  });

  it("accepts an empty reasons array", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    createSpy.mockResolvedValue({ success: true, id: "new-id" });

    const res = await POST(
      makeRequest({
        applicationId: "11111111-1111-4111-8111-111111111111",
        reasons: [],
      }),
    );

    expect(res.status).toBe(201);
  });

  it("returns 500 when the create query fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    createSpy.mockResolvedValue({ success: false, error: "duplicate key" });

    const res = await POST(
      makeRequest({
        applicationId: "11111111-1111-4111-8111-111111111111",
        reasons: [],
      }),
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("duplicate key");
  });
});
