/**
 * Activation server actions — unit tests.
 *
 * Mocks every external boundary (Supabase REST, target-profile upsert, agent
 * dispatch lifecycle helpers, AI model + generateText) so the suite runs
 * fully in-memory. Each action's branches are exercised:
 *
 *   recordIntakeAction          — empty roles, missing user, happy path.
 *   importFirstApplicationAction — manual happy path, gmail-without-OAuth, no-user.
 *   dispatchActivationCROAction — returns dispatch id and triggers async work.
 *   pollActivationDispatchAction — translates every dispatch status.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — hoisted so the action module sees the mocks on first import.
// ---------------------------------------------------------------------------

const {
  getUserMock,
  upsertTargetProfileMock,
  insertQueuedDispatchMock,
  markDispatchRunningMock,
  completeDispatchMock,
  failDispatchMock,
  generateTextMock,
  getAgentModelMock,
  fromMock,
  createApplicationRestMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  upsertTargetProfileMock: vi.fn(),
  insertQueuedDispatchMock: vi.fn(),
  markDispatchRunningMock: vi.fn(),
  completeDispatchMock: vi.fn(),
  failDispatchMock: vi.fn(),
  generateTextMock: vi.fn(),
  getAgentModelMock: vi.fn(() => ({ provider: "stub" })),
  fromMock: vi.fn(),
  createApplicationRestMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getUser: getUserMock,
  createClient: vi.fn(async () => ({
    from: (table: string) => fromMock(table),
  })),
}));

vi.mock("@/lib/agents/cro/target-profile", () => ({
  upsertTargetProfile: upsertTargetProfileMock,
  tryParseTargetProfile: vi.fn(() => null),
}));

vi.mock("@/lib/db/queries/agent-dispatches-rest", () => ({
  insertQueuedDispatch: insertQueuedDispatchMock,
  markDispatchRunning: markDispatchRunningMock,
  completeDispatch: completeDispatchMock,
  failDispatch: failDispatchMock,
}));

vi.mock("@/lib/db/queries/applications-rest", () => ({
  createApplicationRest: createApplicationRestMock,
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: getAgentModelMock,
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/gmail/sync", () => ({
  syncGmailForUser: vi.fn(async () => ({ synced: 0, classified: 0, failed: 0 })),
}));

const {
  recordIntakeAction,
  importFirstApplicationAction,
  dispatchActivationCROAction,
  pollActivationDispatchAction,
} = await import("../actions");

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface QueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
}

function makeBuilder(): QueryBuilder {
  const builder: QueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    like: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.like.mockReturnValue(builder);
  builder.single.mockResolvedValue({ data: null, error: null });
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  return builder;
}

beforeEach(() => {
  getUserMock.mockReset();
  upsertTargetProfileMock.mockReset();
  insertQueuedDispatchMock.mockReset();
  markDispatchRunningMock.mockReset().mockResolvedValue(undefined);
  completeDispatchMock.mockReset().mockResolvedValue(undefined);
  failDispatchMock.mockReset().mockResolvedValue(undefined);
  generateTextMock.mockReset();
  getAgentModelMock.mockReset().mockReturnValue({ provider: "stub" });
  fromMock.mockReset().mockImplementation(() => makeBuilder());
});

// ---------------------------------------------------------------------------
// recordIntakeAction
// ---------------------------------------------------------------------------

describe("recordIntakeAction", () => {
  it("returns no_user when the session is missing", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await recordIntakeAction({
      roles: ["SWE"],
      level: "intern",
      geos: ["NYC"],
    });
    expect(res).toEqual({ ok: false, error: "no_user" });
    expect(upsertTargetProfileMock).not.toHaveBeenCalled();
  });

  it("rejects empty roles", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await recordIntakeAction({
      roles: [],
      level: "intern",
      geos: ["NYC"],
    });
    expect(res).toEqual({ ok: false, error: "roles_required" });
    expect(upsertTargetProfileMock).not.toHaveBeenCalled();
  });

  it("rejects too many roles", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await recordIntakeAction({
      roles: ["a", "b", "c", "d"],
      level: "intern",
      geos: ["NYC"],
    });
    expect(res).toEqual({ ok: false, error: "roles_too_many" });
  });

  it("rejects invalid level", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await recordIntakeAction({
      roles: ["SWE"],
      // @ts-expect-error — intentionally invalid value for the test.
      level: "senior",
      geos: ["NYC"],
    });
    expect(res).toEqual({ ok: false, error: "level_invalid" });
  });

  it("rejects empty geos", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await recordIntakeAction({
      roles: ["SWE"],
      level: "intern",
      geos: [],
    });
    expect(res).toEqual({ ok: false, error: "geos_required" });
  });

  it("calls upsertTargetProfile with companies/musts/nices empty and returns the new id", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    upsertTargetProfileMock.mockResolvedValue({
      profile: { roles: ["SWE"], geos: ["NYC"] },
      embedding: null,
      updatedAt: "2026-01-01",
      rowId: "row-7",
    });
    const res = await recordIntakeAction({
      roles: ["Software Engineer", "Product Manager"],
      level: "intern",
      geos: ["NYC", "Remote"],
    });
    expect(res).toEqual({ ok: true, profileId: "row-7" });
    expect(upsertTargetProfileMock).toHaveBeenCalledTimes(1);
    expect(upsertTargetProfileMock).toHaveBeenCalledWith("u-1", {
      version: 1,
      roles: ["Software Engineer", "Product Manager"],
      level: ["intern"],
      companies: [],
      geos: ["NYC", "Remote"],
      musts: [],
      nices: [],
    });
  });

  it("returns profile_write_failed when upsert returns null", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    upsertTargetProfileMock.mockResolvedValue(null);
    const res = await recordIntakeAction({
      roles: ["SWE"],
      level: "intern",
      geos: ["NYC"],
    });
    expect(res).toEqual({ ok: false, error: "profile_write_failed" });
  });
});

// ---------------------------------------------------------------------------
// importFirstApplicationAction
// ---------------------------------------------------------------------------

describe("importFirstApplicationAction", () => {
  it("returns no_user when the session is missing", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await importFirstApplicationAction({
      source: "manual",
      companyName: "Stripe",
      role: "SWE Intern",
    });
    expect(res).toEqual({ ok: false, error: "no_user" });
  });

  it("rejects manual entry with empty company name", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await importFirstApplicationAction({
      source: "manual",
      companyName: "",
      role: "SWE",
    });
    expect(res).toEqual({ ok: false, error: "company_name_invalid" });
  });

  it("manual happy path inserts the application and returns the new id", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    // The action now routes through the canonical createApplicationRest
    // helper so it inherits limit-check, audit hooks, and match-rescan
    // side effects. The action's only contract is the camelCase input
    // shape and the appId in the returned row.
    createApplicationRestMock.mockResolvedValue({ id: "app-42" });
    const res = await importFirstApplicationAction({
      source: "manual",
      companyName: "Stripe",
      role: "SWE Intern",
      applicationUrl: "https://stripe.com/jobs/123",
    });
    expect(res).toEqual({ ok: true, appId: "app-42" });
    expect(createApplicationRestMock).toHaveBeenCalledWith({
      userId: "u-1",
      companyName: "Stripe",
      role: "SWE Intern",
      url: "https://stripe.com/jobs/123",
      status: "applied",
      source: "manual",
    });
  });

  it("returns application_write_failed when the canonical insert throws", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    createApplicationRestMock.mockRejectedValue(
      new Error("Application limit reached"),
    );
    const res = await importFirstApplicationAction({
      source: "manual",
      companyName: "Stripe",
      role: "SWE Intern",
    });
    expect(res).toEqual({ ok: false, error: "application_write_failed" });
  });

  it("returns no_gmail_oauth when google_tokens is absent", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const profileBuilder = makeBuilder();
    profileBuilder.maybeSingle.mockResolvedValue({
      data: { google_tokens: null },
      error: null,
    });
    fromMock.mockReturnValueOnce(profileBuilder);

    const res = await importFirstApplicationAction({ source: "gmail" });
    expect(res).toEqual({ ok: false, error: "no_gmail_oauth" });
    expect(fromMock).toHaveBeenCalledWith("user_profiles");
  });
});

// ---------------------------------------------------------------------------
// dispatchActivationCROAction
// ---------------------------------------------------------------------------

describe("dispatchActivationCROAction", () => {
  it("returns no_user when the session is missing", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await dispatchActivationCROAction({ appId: "app-1" });
    expect(res).toEqual({ ok: false, error: "no_user" });
  });

  it("rejects when appId is empty", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await dispatchActivationCROAction({ appId: "" });
    expect(res).toEqual({ ok: false, error: "app_id_required" });
    expect(insertQueuedDispatchMock).not.toHaveBeenCalled();
  });

  it("returns the dispatch id and kicks off async work", async () => {
    getUserMock.mockResolvedValue({
      id: "u-1",
      email: "ops@example.com",
      user_metadata: { full_name: "Armaan" },
    });
    insertQueuedDispatchMock.mockResolvedValue("disp-1");
    generateTextMock.mockResolvedValue({
      text: "Reach out to the recruiter today.",
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const res = await dispatchActivationCROAction({ appId: "app-1" });
    expect(res).toEqual({ ok: true, dispatchId: "disp-1" });

    expect(insertQueuedDispatchMock).toHaveBeenCalledWith(
      "u-1",
      expect.any(String),
      "cro",
      "activation_first_action",
    );

    // Drain the fire-and-forget microtask queue so the executor mocks settle.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(markDispatchRunningMock).toHaveBeenCalledWith("disp-1");
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(completeDispatchMock).toHaveBeenCalledWith(
      "disp-1",
      "Reach out to the recruiter today.",
      150,
    );
  });

  it("flips the dispatch to failed when the CRO call throws", async () => {
    getUserMock.mockResolvedValue({
      id: "u-1",
      email: "ops@example.com",
    });
    insertQueuedDispatchMock.mockResolvedValue("disp-2");
    generateTextMock.mockRejectedValue(new Error("model_unavailable"));

    const res = await dispatchActivationCROAction({ appId: "app-1" });
    expect(res).toEqual({ ok: true, dispatchId: "disp-2" });

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(failDispatchMock).toHaveBeenCalledWith("disp-2", "model_unavailable");
    expect(completeDispatchMock).not.toHaveBeenCalled();
  });

  it("returns dispatch_insert_failed when the queue write returns an empty id", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    insertQueuedDispatchMock.mockResolvedValue("");
    const res = await dispatchActivationCROAction({ appId: "app-1" });
    expect(res).toEqual({ ok: false, error: "dispatch_insert_failed" });
  });
});

// ---------------------------------------------------------------------------
// pollActivationDispatchAction
// ---------------------------------------------------------------------------

describe("pollActivationDispatchAction", () => {
  it("returns no_user when the session is missing", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await pollActivationDispatchAction({ dispatchId: "d-1" });
    expect(res).toEqual({ status: "failed", error: "no_user" });
  });

  it("returns dispatch_not_found when the row is missing", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const builder = makeBuilder();
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValueOnce(builder);

    const res = await pollActivationDispatchAction({ dispatchId: "d-1" });
    expect(res).toEqual({ status: "failed", error: "dispatch_not_found" });
  });

  it("returns the queued status when the row is queued", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const builder = makeBuilder();
    builder.maybeSingle.mockResolvedValue({
      data: { status: "queued", summary: null },
      error: null,
    });
    fromMock.mockReturnValueOnce(builder);

    const res = await pollActivationDispatchAction({ dispatchId: "d-1" });
    expect(res).toEqual({ status: "queued" });
  });

  it("returns the running status when the row is running", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const builder = makeBuilder();
    builder.maybeSingle.mockResolvedValue({
      data: { status: "running", summary: null },
      error: null,
    });
    fromMock.mockReturnValueOnce(builder);

    const res = await pollActivationDispatchAction({ dispatchId: "d-1" });
    expect(res).toEqual({ status: "running" });
  });

  it("returns the completed status with the summary when finished", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const builder = makeBuilder();
    builder.maybeSingle.mockResolvedValue({
      data: { status: "completed", summary: "Send the recruiter a note." },
      error: null,
    });
    fromMock.mockReturnValueOnce(builder);

    const res = await pollActivationDispatchAction({ dispatchId: "d-1" });
    expect(res).toEqual({
      status: "completed",
      summary: "Send the recruiter a note.",
    });
  });

  it("returns the failed status with the error string when failed", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const builder = makeBuilder();
    builder.maybeSingle.mockResolvedValue({
      data: { status: "failed", summary: "model_timeout" },
      error: null,
    });
    fromMock.mockReturnValueOnce(builder);

    const res = await pollActivationDispatchAction({ dispatchId: "d-1" });
    expect(res).toEqual({ status: "failed", error: "model_timeout" });
  });
});
