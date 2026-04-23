import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for agent-dispatches-rest.ts.
 *
 * Contract: every helper writes through `createClient().from("agent_dispatches")`
 * with the exact snake_case shape the REST layer expects, and funnels every
 * supabase error into `log.error`. No real DB calls.
 */

// ---------------------------------------------------------------------------
// Mocks — all created via vi.hoisted so they can be referenced inside
// vi.mock factories (Vitest runs factories before imports).
// ---------------------------------------------------------------------------

const {
  insertSpy,
  updateSpy,
  selectSpy,
  selectAfterEqSpy,
  orderSpy,
  eqAfterInsertSpy,
  eqAfterUpdateSpy,
  eqUserSpy,
  eqRequestSpy,
  singleSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  insertSpy: vi.fn(),
  updateSpy: vi.fn(),
  selectSpy: vi.fn(),
  selectAfterEqSpy: vi.fn(),
  orderSpy: vi.fn(),
  eqAfterInsertSpy: vi.fn(),
  eqAfterUpdateSpy: vi.fn(),
  eqUserSpy: vi.fn(),
  eqRequestSpy: vi.fn(),
  singleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      insert: insertSpy,
      update: updateSpy,
      select: selectSpy,
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: logErrorSpy,
  },
}));

// Re-import after mocks.
const {
  insertQueuedDispatch,
  markDispatchRunning,
  completeDispatch,
  failDispatch,
  getDispatchesForRequest,
} = await import("./agent-dispatches-rest");

// ---------------------------------------------------------------------------
// Chain helpers — wire each supabase spy into the chain shape the helper uses.
// ---------------------------------------------------------------------------

/** insert(payload).select("id").single() → result */
function chainInsertReturningId(
  result: { data: { id: string } | null; error: { message: string } | null },
): void {
  singleSpy.mockResolvedValue(result);
  selectSpy.mockReturnValue({ single: singleSpy });
  insertSpy.mockReturnValue({ select: selectSpy });
}

/** update(payload).eq("id", id) → result */
function chainUpdateEqId(
  result: { error: { message: string } | null },
): void {
  eqAfterUpdateSpy.mockResolvedValue(result);
  updateSpy.mockReturnValue({ eq: eqAfterUpdateSpy });
}

/** select("*").eq(user).eq(request).order(...) → result */
function chainSelectForRequest(
  result: { data: Array<Record<string, unknown>> | null; error: { message: string } | null },
): void {
  orderSpy.mockResolvedValue(result);
  eqRequestSpy.mockReturnValue({ order: orderSpy });
  eqUserSpy.mockReturnValue({ eq: eqRequestSpy });
  selectAfterEqSpy.mockReturnValue({ eq: eqUserSpy });
  selectSpy.mockReturnValue({ eq: eqUserSpy });
}

// ---------------------------------------------------------------------------
// Reset before each test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  insertSpy.mockReset();
  updateSpy.mockReset();
  selectSpy.mockReset();
  selectAfterEqSpy.mockReset();
  orderSpy.mockReset();
  eqAfterInsertSpy.mockReset();
  eqAfterUpdateSpy.mockReset();
  eqUserSpy.mockReset();
  eqRequestSpy.mockReset();
  singleSpy.mockReset();
  logErrorSpy.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("insertQueuedDispatch", () => {
  it("inserts a queued row with the correct snake_case shape and returns the new id", async () => {
    chainInsertReturningId({ data: { id: "disp-1" }, error: null });

    const id = await insertQueuedDispatch(
      "user-1",
      "req-abc",
      "cro",
      "Find top 5 cold-start companies",
      ["parent-uuid"],
    );

    expect(id).toBe("disp-1");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload).toEqual({
      user_id: "user-1",
      request_id: "req-abc",
      agent: "cro",
      task: "Find top 5 cold-start companies",
      depends_on: ["parent-uuid"],
      status: "queued",
    });
    // .select("id").single() must be chained so we get the generated id back.
    expect(selectSpy).toHaveBeenCalledWith("id");
    expect(singleSpy).toHaveBeenCalledTimes(1);
  });

  it("defaults depends_on to an empty array when omitted", async () => {
    chainInsertReturningId({ data: { id: "disp-2" }, error: null });

    await insertQueuedDispatch("user-1", "req-abc", "coo", "Check follow-ups");

    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.depends_on).toEqual([]);
  });

  it("returns '' and logs once when supabase returns an error", async () => {
    chainInsertReturningId({
      data: null,
      error: { message: "duplicate key" },
    });

    const id = await insertQueuedDispatch("user-1", "req-abc", "cro", "x");

    expect(id).toBe("");
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("agent_dispatches.insert_failed");
  });
});

describe("markDispatchRunning", () => {
  it("updates status to running with an ISO started_at filtered by id", async () => {
    chainUpdateEqId({ error: null });

    await markDispatchRunning("disp-1");

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.status).toBe("running");
    expect(typeof payload.started_at).toBe("string");
    // Round-trips as an ISO timestamp.
    expect(
      () => new Date(payload.started_at as string).toISOString(),
    ).not.toThrow();
    expect(eqAfterUpdateSpy).toHaveBeenCalledWith("id", "disp-1");
  });

  it("logs once and returns void when supabase returns an error", async () => {
    chainUpdateEqId({ error: { message: "not found" } });

    const result = await markDispatchRunning("disp-missing");

    expect(result).toBeUndefined();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe(
      "agent_dispatches.mark_running_failed",
    );
  });
});

describe("completeDispatch", () => {
  it("writes status=completed with summary, tokens, and completed_at", async () => {
    chainUpdateEqId({ error: null });

    await completeDispatch("disp-1", "Found 5 candidates", 1_234);

    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.status).toBe("completed");
    expect(payload.summary).toBe("Found 5 candidates");
    expect(payload.tokens_used).toBe(1_234);
    expect(typeof payload.completed_at).toBe("string");
    expect(
      () => new Date(payload.completed_at as string).toISOString(),
    ).not.toThrow();
    expect(eqAfterUpdateSpy).toHaveBeenCalledWith("id", "disp-1");
  });
});

describe("failDispatch", () => {
  it("writes status=failed with the error summary and completed_at", async () => {
    chainUpdateEqId({ error: null });

    await failDispatch("disp-1", "OpenAI timeout after 30s");

    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.status).toBe("failed");
    expect(payload.summary).toBe("OpenAI timeout after 30s");
    expect(typeof payload.completed_at).toBe("string");
    expect(eqAfterUpdateSpy).toHaveBeenCalledWith("id", "disp-1");
  });
});

describe("getDispatchesForRequest", () => {
  it("selects * scoped to (user, request) ordered by started_at ASC nullsLast", async () => {
    const rows = [
      {
        id: "disp-1",
        user_id: "user-1",
        request_id: "req-abc",
        parent_dispatch_id: null,
        agent: "cro",
        depends_on: [],
        task: "Find leads",
        status: "completed",
        summary: "Found 5",
        tokens_used: 800,
        started_at: "2026-04-22T10:00:00.000Z",
        completed_at: "2026-04-22T10:00:02.000Z",
        created_at: "2026-04-22T10:00:00.000Z",
        updated_at: "2026-04-22T10:00:02.000Z",
      },
    ];
    chainSelectForRequest({ data: rows, error: null });

    const result = await getDispatchesForRequest("user-1", "req-abc");

    expect(selectSpy).toHaveBeenCalledWith("*");
    expect(eqUserSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqRequestSpy).toHaveBeenCalledWith("request_id", "req-abc");
    expect(orderSpy).toHaveBeenCalledWith("started_at", {
      ascending: true,
      nullsFirst: false,
    });
    expect(result).toEqual(rows);
  });

  it("returns [] and logs once when supabase returns an error", async () => {
    chainSelectForRequest({ data: null, error: { message: "RLS denied" } });

    const result = await getDispatchesForRequest("user-1", "req-abc");

    expect(result).toEqual([]);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe(
      "agent_dispatches.get_for_request_failed",
    );
  });

  it("returns [] (no error) when data is null with no error — defensive null-to-empty", async () => {
    chainSelectForRequest({ data: null, error: null });

    const result = await getDispatchesForRequest("user-1", "req-abc");

    expect(result).toEqual([]);
    expect(logErrorSpy).not.toHaveBeenCalled();
  });
});
