import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AgentDispatchRow } from "@/lib/db/queries/agent-dispatches-rest";

/**
 * Contract tests for GET /api/ceo/dispatches.
 *
 * Covers:
 *   - 401 when unauthenticated
 *   - 400 when requestId missing / not a uuid
 *   - 200 with empty array when no rows (race window)
 *   - 200 with projected rows — asserts no task/summary/tokens_used leak
 *   - Cache-Control: no-store always set
 */

const { getUserSpy, getDispatchesSpy } = vi.hoisted(() => ({
  getUserSpy: vi.fn(),
  getDispatchesSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: getUserSpy,
    },
  }),
}));

vi.mock("@/lib/db/queries/agent-dispatches-rest", () => ({
  getDispatchesForRequest: getDispatchesSpy,
}));

// Re-import after mocks.
const { GET } = await import("./route");

// Zod v4's `.uuid()` enforces version (1-8) + RFC 4122 variant bits.
// These are valid UUID v4s.
const VALID_UUID = "a1b2c3d4-e5f6-4789-8abc-def012345678";
const OTHER_UUID = "12345678-9abc-4def-a012-3456789abcde";

const OK_USER = {
  data: {
    user: {
      id: "user-xyz",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-04-01T00:00:00.000Z",
    },
  },
  error: null,
};

function makeReq(qs: string): Request {
  return new Request(`http://localhost/api/ceo/dispatches${qs}`);
}

function row(overrides: Partial<AgentDispatchRow>): AgentDispatchRow {
  return {
    id: "dispatch-id",
    user_id: "user-xyz",
    request_id: VALID_UUID,
    parent_dispatch_id: null,
    agent: "cro",
    depends_on: [],
    task: "secret task prompt that must not leak",
    status: "running",
    summary: "secret summary from the subagent",
    tokens_used: 1234,
    started_at: "2026-04-23T04:14:22.000Z",
    completed_at: null,
    created_at: "2026-04-23T04:14:21.000Z",
    updated_at: "2026-04-23T04:14:22.000Z",
    ...overrides,
  };
}

describe("GET /api/ceo/dispatches", () => {
  beforeEach(() => {
    getUserSpy.mockReset();
    getDispatchesSpy.mockReset();
  });

  it("returns 401 when unauthenticated and never queries dispatches", async () => {
    getUserSpy.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(makeReq(`?requestId=${VALID_UUID}`));
    expect(res.status).toBe(401);
    expect(getDispatchesSpy).not.toHaveBeenCalled();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 400 when requestId is missing", async () => {
    getUserSpy.mockResolvedValue(OK_USER);

    const res = await GET(makeReq(""));
    expect(res.status).toBe(400);
    expect(getDispatchesSpy).not.toHaveBeenCalled();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 400 when requestId is not a valid uuid", async () => {
    getUserSpy.mockResolvedValue(OK_USER);

    const res = await GET(makeReq("?requestId=not-a-uuid"));
    expect(res.status).toBe(400);
    expect(getDispatchesSpy).not.toHaveBeenCalled();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 200 with empty array when no rows exist yet", async () => {
    getUserSpy.mockResolvedValue(OK_USER);
    getDispatchesSpy.mockResolvedValue([]);

    const res = await GET(makeReq(`?requestId=${VALID_UUID}`));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { dispatches: unknown[] };
    expect(body.dispatches).toEqual([]);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    // RLS-safe: scoped to the authenticated user's id + the provided requestId.
    expect(getDispatchesSpy).toHaveBeenCalledWith("user-xyz", VALID_UUID);
  });

  it("projects rows to agent/status/startedAt/completedAt only (no task/summary/tokens)", async () => {
    getUserSpy.mockResolvedValue(OK_USER);
    getDispatchesSpy.mockResolvedValue([
      row({
        agent: "cro",
        status: "running",
        started_at: "2026-04-23T04:14:22.000Z",
        completed_at: null,
      }),
      row({
        id: "dispatch-2",
        agent: "cio",
        status: "completed",
        started_at: "2026-04-23T04:14:22.500Z",
        completed_at: "2026-04-23T04:14:25.000Z",
      }),
    ]);

    const res = await GET(makeReq(`?requestId=${VALID_UUID}`));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      dispatches: Array<Record<string, unknown>>;
    };
    expect(body.dispatches).toHaveLength(2);

    // Projected fields present.
    expect(body.dispatches[0]).toEqual({
      agent: "cro",
      status: "running",
      startedAt: "2026-04-23T04:14:22.000Z",
      completedAt: null,
    });
    expect(body.dispatches[1]).toEqual({
      agent: "cio",
      status: "completed",
      startedAt: "2026-04-23T04:14:22.500Z",
      completedAt: "2026-04-23T04:14:25.000Z",
    });

    // Sensitive internal fields must NOT be present.
    for (const d of body.dispatches) {
      expect(d).not.toHaveProperty("task");
      expect(d).not.toHaveProperty("summary");
      expect(d).not.toHaveProperty("tokens_used");
      expect(d).not.toHaveProperty("tokensUsed");
      expect(d).not.toHaveProperty("id");
      expect(d).not.toHaveProperty("user_id");
      expect(d).not.toHaveProperty("userId");
      expect(d).not.toHaveProperty("request_id");
      expect(d).not.toHaveProperty("parent_dispatch_id");
      expect(d).not.toHaveProperty("depends_on");
    }
  });

  it("always sets Cache-Control: no-store on 200 responses", async () => {
    getUserSpy.mockResolvedValue(OK_USER);
    getDispatchesSpy.mockResolvedValue([]);

    const res = await GET(makeReq(`?requestId=${OTHER_UUID}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
