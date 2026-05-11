import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for handoff-dossiers-rest.ts.
 *
 * Contract:
 *   - insertDossier → INSERT row (snake_case) via service-role admin client,
 *     RETURNING id; returns "" + logs once on error.
 *   - listDossiersForRequest → SELECT * scoped to (user_id, request_id),
 *     ordered by created_at ASC. Returns [] + logs once on error.
 *   - listRecentDossiersForUser → SELECT * scoped to user_id, ordered by
 *     created_at DESC, default limit 20, optional `.in("status", […])`
 *     filter. Returns [] + logs once on error.
 *   - updateDossierDecision → UPDATE { status, decided_at } scoped to
 *     (user_id, id), RETURNING *. Returns null on error.
 *   - markDossierExecuted → UPDATE { status: "executed", executed_at }
 *     scoped to id only (works for both user and admin clients). Returns
 *     true / false; logs once on failure.
 */

const {
  adminFromSpy,
  insertSpy,
  insertSelectSpy,
  insertSingleSpy,
  updateSpy,
  selectSpy,
  eqAfterUpdateUserSpy,
  eqAfterUpdateIdSpy,
  eqAfterUpdateOnlyIdSpy,
  updateSelectSpy,
  updateMaybeSingleSpy,
  eqUserSelectSpy,
  eqRequestSpy,
  orderSpy,
  limitSpy,
  inSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  adminFromSpy: vi.fn(),
  insertSpy: vi.fn(),
  insertSelectSpy: vi.fn(),
  insertSingleSpy: vi.fn(),
  updateSpy: vi.fn(),
  selectSpy: vi.fn(),
  eqAfterUpdateUserSpy: vi.fn(),
  eqAfterUpdateIdSpy: vi.fn(),
  eqAfterUpdateOnlyIdSpy: vi.fn(),
  updateSelectSpy: vi.fn(),
  updateMaybeSingleSpy: vi.fn(),
  eqUserSelectSpy: vi.fn(),
  eqRequestSpy: vi.fn(),
  orderSpy: vi.fn(),
  limitSpy: vi.fn(),
  inSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: adminFromSpy,
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

const {
  insertDossier,
  listDossiersForRequest,
  listRecentDossiersForUser,
  updateDossierDecision,
  markDossierExecuted,
} = await import("../handoff-dossiers-rest");

// ---------------------------------------------------------------------------
// Helpers — build a caller-supplied SupabaseClient mock with the same builder
// surface every test uses.
// ---------------------------------------------------------------------------

type AnyFn = (...args: unknown[]) => unknown;

function makeClient(builder: Record<string, AnyFn>) {
  const from = vi.fn(() => builder);
  return { client: { from } as unknown as Parameters<typeof listDossiersForRequest>[0], from };
}

beforeEach(() => {
  adminFromSpy.mockReset();
  insertSpy.mockReset();
  insertSelectSpy.mockReset();
  insertSingleSpy.mockReset();
  updateSpy.mockReset();
  selectSpy.mockReset();
  eqAfterUpdateUserSpy.mockReset();
  eqAfterUpdateIdSpy.mockReset();
  eqAfterUpdateOnlyIdSpy.mockReset();
  updateSelectSpy.mockReset();
  updateMaybeSingleSpy.mockReset();
  eqUserSelectSpy.mockReset();
  eqRequestSpy.mockReset();
  orderSpy.mockReset();
  limitSpy.mockReset();
  inSpy.mockReset();
  logErrorSpy.mockReset();

  // Wire the admin client's from() to a builder exposing .insert(...)
  adminFromSpy.mockReturnValue({ insert: insertSpy });
  insertSpy.mockReturnValue({ select: insertSelectSpy });
  insertSelectSpy.mockReturnValue({ single: insertSingleSpy });
});

// ---------------------------------------------------------------------------
// insertDossier
// ---------------------------------------------------------------------------

describe("insertDossier", () => {
  it("inserts a row with snake_case shape + defaults, returning the new id", async () => {
    insertSingleSpy.mockResolvedValue({ data: { id: "dossier-1" }, error: null });

    const id = await insertDossier({
      userId: "user-1",
      requestId: "req-abc",
      owner: "cro",
      task: "Find top 5 leads",
      proposedAction: "Add to pipeline",
      recommendation: "I'd queue Acme + Globex first.",
    });

    expect(id).toBe("dossier-1");
    expect(adminFromSpy).toHaveBeenCalledWith("handoff_dossiers");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload).toEqual({
      user_id: "user-1",
      request_id: "req-abc",
      dispatch_id: null,
      owner: "cro",
      requesting_agent: "ceo",
      task: "Find top 5 leads",
      evidence: [],
      open_questions: [],
      confidence: null,
      disagreement: null,
      proposed_action: "Add to pipeline",
      permission_needed: "none",
      deadline: null,
      recommendation: "I'd queue Acme + Globex first.",
    });
    expect(insertSelectSpy).toHaveBeenCalledWith("id");
    expect(insertSingleSpy).toHaveBeenCalledTimes(1);
  });

  it("passes through optional fields when supplied", async () => {
    insertSingleSpy.mockResolvedValue({ data: { id: "dossier-2" }, error: null });

    await insertDossier({
      userId: "user-1",
      requestId: "req-xyz",
      dispatchId: "disp-9",
      owner: "cmo",
      requestingAgent: "ceo",
      task: "Draft cover letter",
      evidence: [{ kind: "application", id: "app-1", summary: "Globex SWE Intern" }],
      openQuestions: ["What tone?", "Length?"],
      confidence: 78,
      disagreement: { with: "cro", note: "Different ranking signal" },
      proposedAction: "Send draft",
      permissionNeeded: "draft",
      deadline: "2026-06-01T10:00:00.000Z",
      recommendation: "Draft is ready for your review.",
    });

    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.dispatch_id).toBe("disp-9");
    expect(payload.requesting_agent).toBe("ceo");
    expect(payload.open_questions).toEqual(["What tone?", "Length?"]);
    expect(payload.confidence).toBe(78);
    expect(payload.permission_needed).toBe("draft");
    expect(payload.deadline).toBe("2026-06-01T10:00:00.000Z");
    expect(payload.evidence).toEqual([
      { kind: "application", id: "app-1", summary: "Globex SWE Intern" },
    ]);
    expect(payload.disagreement).toEqual({ with: "cro", note: "Different ranking signal" });
  });

  it("returns '' and logs once when supabase returns an error", async () => {
    insertSingleSpy.mockResolvedValue({ data: null, error: { message: "constraint" } });

    const id = await insertDossier({
      userId: "user-1",
      requestId: "req-abc",
      owner: "cro",
      task: "x",
      proposedAction: "y",
      recommendation: "z",
    });

    expect(id).toBe("");
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("handoff_dossiers.insert_failed");
  });
});

// ---------------------------------------------------------------------------
// listDossiersForRequest
// ---------------------------------------------------------------------------

describe("listDossiersForRequest", () => {
  it("selects * scoped to (user, request) ordered by created_at ASC", async () => {
    const rows = [
      { id: "d-1", user_id: "user-1", request_id: "req-abc", status: "ready" },
      { id: "d-2", user_id: "user-1", request_id: "req-abc", status: "ready" },
    ];
    orderSpy.mockResolvedValue({ data: rows, error: null });
    eqRequestSpy.mockReturnValue({ order: orderSpy });
    eqUserSelectSpy.mockReturnValue({ eq: eqRequestSpy });
    selectSpy.mockReturnValue({ eq: eqUserSelectSpy });

    const { client, from } = makeClient({ select: selectSpy });

    const out = await listDossiersForRequest(client, "user-1", "req-abc");

    expect(from).toHaveBeenCalledWith("handoff_dossiers");
    expect(selectSpy).toHaveBeenCalledWith("*");
    expect(eqUserSelectSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqRequestSpy).toHaveBeenCalledWith("request_id", "req-abc");
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(out).toEqual(rows);
  });

  it("returns [] and logs once on error", async () => {
    orderSpy.mockResolvedValue({ data: null, error: { message: "RLS denied" } });
    eqRequestSpy.mockReturnValue({ order: orderSpy });
    eqUserSelectSpy.mockReturnValue({ eq: eqRequestSpy });
    selectSpy.mockReturnValue({ eq: eqUserSelectSpy });

    const { client } = makeClient({ select: selectSpy });

    const out = await listDossiersForRequest(client, "user-1", "req-abc");

    expect(out).toEqual([]);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("handoff_dossiers.list_for_request_failed");
  });
});

// ---------------------------------------------------------------------------
// listRecentDossiersForUser
// ---------------------------------------------------------------------------

describe("listRecentDossiersForUser", () => {
  it("defaults to limit 20 newest-first and no status filter", async () => {
    const rows = [{ id: "d-9", user_id: "user-1", status: "ready" }];
    limitSpy.mockResolvedValue({ data: rows, error: null });
    orderSpy.mockReturnValue({ limit: limitSpy });
    eqUserSelectSpy.mockReturnValue({ order: orderSpy });
    selectSpy.mockReturnValue({ eq: eqUserSelectSpy });

    const { client } = makeClient({ select: selectSpy });

    const out = await listRecentDossiersForUser(client, "user-1");

    expect(selectSpy).toHaveBeenCalledWith("*");
    expect(eqUserSelectSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limitSpy).toHaveBeenCalledWith(20);
    expect(out).toEqual(rows);
  });

  it("applies a status filter via .in() when provided", async () => {
    const rows = [{ id: "d-1", status: "ready" }];
    inSpy.mockResolvedValue({ data: rows, error: null });
    limitSpy.mockReturnValue({ in: inSpy });
    orderSpy.mockReturnValue({ limit: limitSpy });
    eqUserSelectSpy.mockReturnValue({ order: orderSpy });
    selectSpy.mockReturnValue({ eq: eqUserSelectSpy });

    const { client } = makeClient({ select: selectSpy });

    const out = await listRecentDossiersForUser(client, "user-1", {
      limit: 5,
      status: ["ready", "approved"],
    });

    expect(limitSpy).toHaveBeenCalledWith(5);
    expect(inSpy).toHaveBeenCalledWith("status", ["ready", "approved"]);
    expect(out).toEqual(rows);
  });

  it("returns [] and logs once on error", async () => {
    limitSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    orderSpy.mockReturnValue({ limit: limitSpy });
    eqUserSelectSpy.mockReturnValue({ order: orderSpy });
    selectSpy.mockReturnValue({ eq: eqUserSelectSpy });

    const { client } = makeClient({ select: selectSpy });

    const out = await listRecentDossiersForUser(client, "user-1");

    expect(out).toEqual([]);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("handoff_dossiers.list_recent_failed");
  });
});

// ---------------------------------------------------------------------------
// updateDossierDecision
// ---------------------------------------------------------------------------

describe("updateDossierDecision", () => {
  it("stamps status + decided_at scoped to (user, id) and returns the row", async () => {
    const row = { id: "d-1", user_id: "user-1", status: "approved" };
    updateMaybeSingleSpy.mockResolvedValue({ data: row, error: null });
    updateSelectSpy.mockReturnValue({ maybeSingle: updateMaybeSingleSpy });
    eqAfterUpdateIdSpy.mockReturnValue({ select: updateSelectSpy });
    eqAfterUpdateUserSpy.mockReturnValue({ eq: eqAfterUpdateIdSpy });
    updateSpy.mockReturnValue({ eq: eqAfterUpdateUserSpy });

    const { client } = makeClient({ update: updateSpy });

    const out = await updateDossierDecision(client, "user-1", "d-1", { status: "approved" });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.status).toBe("approved");
    expect(typeof payload.decided_at).toBe("string");
    expect(() => new Date(payload.decided_at as string).toISOString()).not.toThrow();
    expect(eqAfterUpdateUserSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqAfterUpdateIdSpy).toHaveBeenCalledWith("id", "d-1");
    expect(updateSelectSpy).toHaveBeenCalledWith("*");
    expect(out).toEqual(row);
  });

  it("returns null and logs once on error", async () => {
    updateMaybeSingleSpy.mockResolvedValue({ data: null, error: { message: "denied" } });
    updateSelectSpy.mockReturnValue({ maybeSingle: updateMaybeSingleSpy });
    eqAfterUpdateIdSpy.mockReturnValue({ select: updateSelectSpy });
    eqAfterUpdateUserSpy.mockReturnValue({ eq: eqAfterUpdateIdSpy });
    updateSpy.mockReturnValue({ eq: eqAfterUpdateUserSpy });

    const { client } = makeClient({ update: updateSpy });

    const out = await updateDossierDecision(client, "user-1", "d-1", { status: "rejected" });

    expect(out).toBeNull();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("handoff_dossiers.decision_failed");
  });
});

// ---------------------------------------------------------------------------
// markDossierExecuted
// ---------------------------------------------------------------------------

describe("markDossierExecuted", () => {
  it("writes status=executed + executed_at scoped to id, returns true", async () => {
    eqAfterUpdateOnlyIdSpy.mockResolvedValue({ error: null });
    updateSpy.mockReturnValue({ eq: eqAfterUpdateOnlyIdSpy });

    const { client } = makeClient({ update: updateSpy });

    const out = await markDossierExecuted(client, "d-1");

    expect(out).toBe(true);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.status).toBe("executed");
    expect(typeof payload.executed_at).toBe("string");
    expect(() => new Date(payload.executed_at as string).toISOString()).not.toThrow();
    expect(eqAfterUpdateOnlyIdSpy).toHaveBeenCalledWith("id", "d-1");
  });

  it("uses the supplied executedAt timestamp when given", async () => {
    eqAfterUpdateOnlyIdSpy.mockResolvedValue({ error: null });
    updateSpy.mockReturnValue({ eq: eqAfterUpdateOnlyIdSpy });

    const { client } = makeClient({ update: updateSpy });

    await markDossierExecuted(client, "d-1", "2026-06-01T12:00:00.000Z");

    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.executed_at).toBe("2026-06-01T12:00:00.000Z");
  });

  it("returns false and logs once on error", async () => {
    eqAfterUpdateOnlyIdSpy.mockResolvedValue({ error: { message: "missing" } });
    updateSpy.mockReturnValue({ eq: eqAfterUpdateOnlyIdSpy });

    const { client } = makeClient({ update: updateSpy });

    const out = await markDossierExecuted(client, "d-missing");

    expect(out).toBe(false);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("handoff_dossiers.mark_executed_failed");
  });
});
