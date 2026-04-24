import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * R9.6 — Tests for rejection-reflections-rest.ts.
 *
 * Contract:
 *   - listReflectionsForUser → SELECT * with eq(user_id) + order(created_at desc) + limit
 *   - getReflectionForApplication → SELECT * with eq(user_id) + eq(application_id) + maybeSingle
 *   - createRejectionReflection → INSERT row, RETURNING id
 *   - All three pass returned rows through the Zod validator before handing
 *     them back to callers; bad shapes are dropped from the list, returned
 *     as null from the single-getter, and reported as { success: false }
 *     from the create.
 */

const {
  fromSpy,
  selectSpy,
  insertSpy,
  eqUserSpy,
  eqAppSpy,
  orderSpy,
  limitSpy,
  maybeSingleSpy,
  insertSelectSpy,
  insertSingleSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  fromSpy: vi.fn(),
  selectSpy: vi.fn(),
  insertSpy: vi.fn(),
  eqUserSpy: vi.fn(),
  eqAppSpy: vi.fn(),
  orderSpy: vi.fn(),
  limitSpy: vi.fn(),
  maybeSingleSpy: vi.fn(),
  insertSelectSpy: vi.fn(),
  insertSingleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: fromSpy,
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
  listReflectionsForUser,
  getReflectionForApplication,
  createRejectionReflection,
} = await import("./rejection-reflections-rest");

beforeEach(() => {
  fromSpy.mockReset();
  selectSpy.mockReset();
  insertSpy.mockReset();
  eqUserSpy.mockReset();
  eqAppSpy.mockReset();
  orderSpy.mockReset();
  limitSpy.mockReset();
  maybeSingleSpy.mockReset();
  insertSelectSpy.mockReset();
  insertSingleSpy.mockReset();
  logErrorSpy.mockReset();

  // Default: every from() call returns the spy chain. Per-test overrides
  // re-bind specific links.
  fromSpy.mockReturnValue({
    select: selectSpy,
    insert: insertSpy,
  });
});

// Helpers ----------------------------------------------------------------

/** select("*").eq("user_id", u).order(...).limit(n) → result */
function chainListSelect(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}): void {
  limitSpy.mockResolvedValue(result);
  orderSpy.mockReturnValue({ limit: limitSpy });
  eqUserSpy.mockReturnValue({ order: orderSpy });
  selectSpy.mockReturnValue({ eq: eqUserSpy });
}

/** select("*").eq("user_id", u).eq("application_id", a).maybeSingle() → result */
function chainGetSelect(result: {
  data: unknown | null;
  error: { message: string } | null;
}): void {
  maybeSingleSpy.mockResolvedValue(result);
  eqAppSpy.mockReturnValue({ maybeSingle: maybeSingleSpy });
  eqUserSpy.mockReturnValue({ eq: eqAppSpy });
  selectSpy.mockReturnValue({ eq: eqUserSpy });
}

/** insert({...}).select("id").single() → result */
function chainInsert(result: {
  data: { id: string } | null;
  error: { message: string } | null;
}): void {
  insertSingleSpy.mockResolvedValue(result);
  insertSelectSpy.mockReturnValue({ single: insertSingleSpy });
  insertSpy.mockReturnValue({ select: insertSelectSpy });
}

// Zod v4's `.uuid()` enforces RFC 4122 variant bits (8/9/a/b in the
// 17th hex), so naive `11111111-...` fixtures fail. These are valid v4 UUIDs.
const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  application_id: "33333333-3333-4333-8333-333333333333",
  reasons: ["No response"],
  free_text: null,
  created_at: "2026-04-23T10:00:00.000Z",
};

// ===========================================================================
// listReflectionsForUser
// ===========================================================================

describe("listReflectionsForUser", () => {
  it("returns parsed rows on success", async () => {
    chainListSelect({ data: [VALID_ROW], error: null });

    const result = await listReflectionsForUser("user-1");

    expect(fromSpy).toHaveBeenCalledWith("rejection_reflections");
    expect(selectSpy).toHaveBeenCalledWith("*");
    expect(eqUserSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limitSpy).toHaveBeenCalledWith(100);
    expect(result).toEqual([VALID_ROW]);
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("respects an explicit limit", async () => {
    chainListSelect({ data: [], error: null });

    await listReflectionsForUser("user-1", 25);

    expect(limitSpy).toHaveBeenCalledWith(25);
  });

  it("returns [] and logs once on error", async () => {
    chainListSelect({
      data: null,
      error: { message: "RLS denied" },
    });

    const result = await listReflectionsForUser("user-1");

    expect(result).toEqual([]);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe(
      "rejection_reflections.list_failed",
    );
  });

  it("drops rows that fail validation", async () => {
    const bad = { id: "not-a-uuid", reasons: "not-an-array" };
    chainListSelect({ data: [VALID_ROW, bad], error: null });

    const result = await listReflectionsForUser("user-1");

    expect(result).toEqual([VALID_ROW]);
  });

  it("returns [] when supabase returns null data with no error", async () => {
    chainListSelect({ data: null, error: null });

    const result = await listReflectionsForUser("user-1");

    expect(result).toEqual([]);
    expect(logErrorSpy).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// getReflectionForApplication
// ===========================================================================

describe("getReflectionForApplication", () => {
  it("returns the parsed row when present", async () => {
    chainGetSelect({ data: VALID_ROW, error: null });

    const result = await getReflectionForApplication(
      "user-1",
      VALID_ROW.application_id,
    );

    expect(fromSpy).toHaveBeenCalledWith("rejection_reflections");
    expect(eqUserSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqAppSpy).toHaveBeenCalledWith("application_id", VALID_ROW.application_id);
    expect(result).toEqual(VALID_ROW);
  });

  it("returns null when no row exists", async () => {
    chainGetSelect({ data: null, error: null });

    const result = await getReflectionForApplication("user-1", "app-x");

    expect(result).toBeNull();
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("returns null and logs once on error", async () => {
    chainGetSelect({ data: null, error: { message: "boom" } });

    const result = await getReflectionForApplication("user-1", "app-x");

    expect(result).toBeNull();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe(
      "rejection_reflections.get_failed",
    );
  });

  it("returns null when the row fails validation", async () => {
    chainGetSelect({
      data: { id: "not-a-uuid" },
      error: null,
    });

    const result = await getReflectionForApplication("user-1", "app-x");

    expect(result).toBeNull();
  });
});

// ===========================================================================
// createRejectionReflection
// ===========================================================================

describe("createRejectionReflection", () => {
  it("inserts the row with the right shape and returns { success: true, id }", async () => {
    chainInsert({ data: { id: "new-id" }, error: null });

    const result = await createRejectionReflection({
      userId: "user-1",
      applicationId: "app-1",
      reasons: ["No response", "Pass didn't match"],
      freeText: "couldn't tell",
    });

    expect(result).toEqual({ success: true, id: "new-id" });
    expect(fromSpy).toHaveBeenCalledWith("rejection_reflections");
    expect(insertSpy).toHaveBeenCalledTimes(1);

    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.user_id).toBe("user-1");
    expect(payload.application_id).toBe("app-1");
    expect(payload.reasons).toEqual(["No response", "Pass didn't match"]);
    expect(payload.free_text).toBe("couldn't tell");
    expect(insertSelectSpy).toHaveBeenCalledWith("id");
  });

  it("normalizes a missing freeText to null", async () => {
    chainInsert({ data: { id: "new-id" }, error: null });

    await createRejectionReflection({
      userId: "user-1",
      applicationId: "app-1",
      reasons: [],
    });

    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.free_text).toBeNull();
    expect(payload.reasons).toEqual([]);
  });

  it("returns { success: false, error } on insert error and logs once", async () => {
    chainInsert({
      data: null,
      error: { message: "duplicate key" },
    });

    const result = await createRejectionReflection({
      userId: "user-1",
      applicationId: "app-1",
      reasons: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("duplicate key");
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe(
      "rejection_reflections.create_failed",
    );
  });
});
