import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * POST /api/profile/preferences contract tests.
 *
 * Generic merge endpoint into user_profiles.preferences jsonb. R9.6 ships
 * with `rejectionReflections` whitelisted; future tasks add more keys.
 *
 * Invariants:
 *   - 401 unauthenticated.
 *   - 400 unknown key.
 *   - 400 invalid value shape for a known key.
 *   - 200 successful update.
 *   - The merge preserves other keys in `preferences`.
 *   - The body is read via `.maybeSingle()` and the missing-row case is
 *     treated as an empty preferences blob.
 */

const {
  requireUserSpy,
  fromSpy,
  selectSpy,
  selectEqSpy,
  maybeSingleSpy,
  updateSpy,
  updateEqSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  fromSpy: vi.fn(),
  selectSpy: vi.fn(),
  selectEqSpy: vi.fn(),
  maybeSingleSpy: vi.fn(),
  updateSpy: vi.fn(),
  updateEqSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: fromSpy,
  }),
}));

const { POST } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-abc", email: "owner@example.com" },
};

beforeEach(() => {
  requireUserSpy.mockReset();
  fromSpy.mockReset();
  selectSpy.mockReset();
  selectEqSpy.mockReset();
  maybeSingleSpy.mockReset();
  updateSpy.mockReset();
  updateEqSpy.mockReset();

  fromSpy.mockReturnValue({
    select: selectSpy,
    update: updateSpy,
  });
});

function chainSelect(result: {
  data: { preferences: unknown } | null;
  error: { message: string } | null;
}): void {
  maybeSingleSpy.mockResolvedValue(result);
  selectEqSpy.mockReturnValue({ maybeSingle: maybeSingleSpy });
  selectSpy.mockReturnValue({ eq: selectEqSpy });
}

function chainUpdate(result: { error: { message: string } | null }): void {
  updateEqSpy.mockResolvedValue(result);
  updateSpy.mockReturnValue({ eq: updateEqSpy });
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/profile/preferences", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

describe("POST /api/profile/preferences — auth + body validation", () => {
  it("returns 401 when unauthenticated and never touches the DB", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(
      makeRequest({ key: "rejectionReflections", value: { enabled: true } }),
    );

    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when key is missing", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(makeRequest({ value: { enabled: true } }));
    expect(res.status).toBe(400);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when key is not a known whitelisted key", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makeRequest({ key: "shadowKey", value: { enabled: true } }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unknown_key");
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when value fails the per-key schema", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makeRequest({
        key: "rejectionReflections",
        value: { enabled: "yes" },
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_value");
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not valid JSON", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    const req = new Request("http://localhost/api/profile/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "garbage",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/profile/preferences — merge semantics", () => {
  it("returns 200 on a successful update", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({ data: { preferences: {} }, error: null });
    chainUpdate({ error: null });

    const res = await POST(
      makeRequest({
        key: "rejectionReflections",
        value: { enabled: false },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("merges preserving other keys in preferences", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({
      data: {
        preferences: {
          unrelatedKey: "untouched",
          rejectionReflections: { enabled: true },
        },
      },
      error: null,
    });
    chainUpdate({ error: null });

    const res = await POST(
      makeRequest({
        key: "rejectionReflections",
        value: { enabled: false },
      }),
    );

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const next = payload.preferences as Record<string, unknown>;
    expect(next.unrelatedKey).toBe("untouched");
    expect(next.rejectionReflections).toEqual({ enabled: false });
  });

  it("treats null/missing preferences row as empty blob", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({ data: { preferences: null }, error: null });
    chainUpdate({ error: null });

    const res = await POST(
      makeRequest({
        key: "rejectionReflections",
        value: { enabled: true },
      }),
    );

    expect(res.status).toBe(200);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const next = payload.preferences as Record<string, unknown>;
    expect(next.rejectionReflections).toEqual({ enabled: true });
    // Only the namespaced key, since input was empty.
    expect(Object.keys(next)).toEqual(["rejectionReflections"]);
  });

  it("returns 500 if the update query fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({ data: { preferences: {} }, error: null });
    chainUpdate({ error: { message: "write failed" } });

    const res = await POST(
      makeRequest({
        key: "rejectionReflections",
        value: { enabled: true },
      }),
    );

    expect(res.status).toBe(500);
  });

  it("returns 500 if the read query fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({ data: null, error: { message: "RLS denied" } });

    const res = await POST(
      makeRequest({
        key: "rejectionReflections",
        value: { enabled: true },
      }),
    );

    expect(res.status).toBe(500);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

/**
 * Whitelist extensions. Three new keys join the registry: ceoVoice
 * (CEO voice read-aloud opt-in), parlorDoorSeen (door-materialization latch),
 * parlorCfoQuipShown (CFO entry-quip latch). The shape and failure modes are
 * identical to the R9.6 key — known key + valid body → 200 with a patched
 * preferences blob; known key + invalid body → 400 invalid_value; unknown
 * key → 400 unknown_key.
 */
describe("POST /api/profile/preferences — R10 whitelist", () => {
  it("accepts ceoVoice { enabled: true } and patches preferences", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({ data: { preferences: {} }, error: null });
    chainUpdate({ error: null });

    const res = await POST(
      makeRequest({ key: "ceoVoice", value: { enabled: true } }),
    );

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const next = payload.preferences as Record<string, unknown>;
    expect(next.ceoVoice).toEqual({ enabled: true });
  });

  it("rejects ceoVoice { enabled: 'yes' } with 400 invalid_value", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makeRequest({ key: "ceoVoice", value: { enabled: "yes" } }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_value");
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("accepts parlorDoorSeen { seen: true } and patches preferences", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    chainSelect({ data: { preferences: {} }, error: null });
    chainUpdate({ error: null });

    const res = await POST(
      makeRequest({ key: "parlorDoorSeen", value: { seen: true } }),
    );

    expect(res.status).toBe(200);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const next = payload.preferences as Record<string, unknown>;
    expect(next.parlorDoorSeen).toEqual({ seen: true });
  });

  it("still rejects unknown keys with 400 unknown_key (regression)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makeRequest({ key: "notAKey", value: {} }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unknown_key");
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
