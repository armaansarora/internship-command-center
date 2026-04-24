/**
 * R11 Red Team follow-up — revoke-cascade tests.
 *
 * The consent copy promises "Revoking is instant. Within 60 seconds, your
 * name and applications are removed from the match index." Before the
 * Red Team fix, revoke stamped `networking_revoked_at` and cleared the R8
 * `networking_match_index` — but NOT the R11 `match_candidate_index`,
 * which holds per-user precomputed caches. Other users' caches kept
 * surfacing the revoker's anon-keys for up to 24h (the cron rebuild TTL).
 *
 * This suite binds the fix: on revoke, all three steps fire (stamp,
 * R8-clear, R11-cascade-purge) and the route fails closed if the
 * R11 cascade errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockProfileUpdate = vi.fn();
const mockIndexDelete = vi.fn();
const mockContactsSelect = vi.fn();
const mockCandidateIndexDelete = vi.fn();

// Tracks the full flow so tests can assert ordering / absence.
const callLog: Array<{ table: string; op: string; payload?: unknown }> = [];

function resetMocks() {
  vi.clearAllMocks();
  callLog.length = 0;
  // Sensible defaults — each test overrides the ones it cares about.
  mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
  mockProfileUpdate.mockReturnValue(
    Promise.resolve({ data: null, error: null }),
  );
  mockIndexDelete.mockReturnValue(
    Promise.resolve({ data: null, error: null }),
  );
  mockContactsSelect.mockReturnValue(
    Promise.resolve({ data: [], error: null }),
  );
  mockCandidateIndexDelete.mockReturnValue(
    Promise.resolve({ data: null, error: null }),
  );
}

const supabaseFromImpl = (table: string) => {
  if (table === "user_profiles") {
    return {
      update: (payload: unknown) => ({
        eq: (_col: string, _val: unknown) => {
          callLog.push({ table, op: "update", payload });
          return mockProfileUpdate();
        },
      }),
    };
  }
  if (table === "networking_match_index") {
    return {
      delete: () => ({
        eq: (_col: string, _val: unknown) => {
          callLog.push({ table, op: "delete_eq" });
          return mockIndexDelete();
        },
      }),
    };
  }
  if (table === "contacts") {
    return {
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => {
          callLog.push({ table, op: "select_eq" });
          return mockContactsSelect();
        },
      }),
    };
  }
  if (table === "match_candidate_index") {
    return {
      delete: () => ({
        in: (_col: string, vals: unknown[]) => {
          callLog.push({ table, op: "delete_in", payload: vals });
          return mockCandidateIndexDelete();
        },
      }),
    };
  }
  throw new Error(`unexpected table: ${table}`);
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (t: string) => supabaseFromImpl(t),
  }),
}));

// Mock the logger — otherwise `log.error` in the route triggers env.ts's
// Supabase-URL validation and crashes the test in environments without
// a populated .env.local (CI, fresh clones, etc.).
vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// HMAC secret must be present — the route calls counterpartyAnonKey which
// fails closed without it. Set a deterministic value before each test.
beforeEach(() => {
  process.env.MATCH_ANON_SECRET = "test-anon-secret";
  resetMocks();
});

describe("POST /api/networking/revoke — cascade purge (R11 Red Team fix)", () => {
  it("returns 401 when unauthenticated and never mutates anything", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(401);
    expect(callLog).toEqual([]);
  });

  it("stamps revoke, clears R8 index, and cascade-purges R11 index with this user's contacts' anon-keys", async () => {
    mockContactsSelect.mockResolvedValueOnce({
      data: [
        { id: "contact-a" },
        { id: "contact-b" },
        { id: "contact-c" },
      ],
      error: null,
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(200);

    // Step ordering — stamp first (binding guard), then R8 clear, then
    // contacts select, then R11 cascade.
    expect(callLog.map((c) => `${c.table}:${c.op}`)).toEqual([
      "user_profiles:update",
      "networking_match_index:delete_eq",
      "contacts:select_eq",
      "match_candidate_index:delete_in",
    ]);

    // Cascade anon-keys must be deterministic HMAC-SHA256 hex (64 chars).
    const cascade = callLog.find(
      (c) => c.table === "match_candidate_index" && c.op === "delete_in",
    );
    const keys = cascade?.payload as string[];
    expect(keys).toHaveLength(3);
    for (const k of keys) {
      expect(k).toMatch(/^[0-9a-f]{64}$/);
    }
    // Keys are distinct per contact-id (binding for cascade correctness).
    expect(new Set(keys).size).toBe(3);
  });

  it("skips the cascade delete when the user has zero contacts (still ok)", async () => {
    mockContactsSelect.mockResolvedValueOnce({ data: [], error: null });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(200);

    // No match_candidate_index delete when there are no contacts to purge.
    expect(
      callLog.find((c) => c.table === "match_candidate_index"),
    ).toBeUndefined();
  });

  it("fails closed with 500 revoke-cascade-failed if the R11 cascade delete errors", async () => {
    mockContactsSelect.mockResolvedValueOnce({
      data: [{ id: "contact-a" }],
      error: null,
    });
    mockCandidateIndexDelete.mockResolvedValueOnce({
      data: null,
      error: { message: "cascade broken" },
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; reason: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("revoke-cascade-failed");
  });

  it("fails closed with 500 revoke-cascade-failed if MATCH_ANON_SECRET is missing", async () => {
    process.env.MATCH_ANON_SECRET = "";
    mockContactsSelect.mockResolvedValueOnce({
      data: [{ id: "contact-a" }],
      error: null,
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("revoke-cascade-failed");
  });

  it("fails closed with 500 revoke-cascade-failed if the contacts select errors", async () => {
    mockContactsSelect.mockResolvedValueOnce({
      data: null,
      error: { message: "contacts query broken" },
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("revoke-cascade-failed");
  });

  it("returns 500 stamp-error if the profile update fails (never reaches cascade)", async () => {
    mockProfileUpdate.mockResolvedValueOnce({
      data: null,
      error: { message: "stamp broken" },
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(500);
    // Cascade did not fire — stamp failure short-circuits.
    expect(
      callLog.find((c) => c.table === "match_candidate_index"),
    ).toBeUndefined();
  });
});
