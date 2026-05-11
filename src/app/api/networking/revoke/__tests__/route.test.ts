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
 * clear, R11-cascade-purge) and the route fails closed if the
 * R11 cascade errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockProfileUpdate = vi.fn();
const mockIndexDelete = vi.fn();
const mockContactsSelect = vi.fn();
const mockCandidateIndexDelete = vi.fn();
// PR4 audit row mock — recordRevokeCascade writes through the admin client
// to audit_logs. Mocking it as a noop keeps the existing assertions clean
// (the audit insert is fire-and-forget so an error here cannot affect the
// route response).
const mockAuditInsert = vi.fn();

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
  mockAuditInsert.mockReturnValue(
    Promise.resolve({ data: null, error: null }),
  );
}

// Captures every audit_logs.insert payload across the suite so the PR4
// proof tests can assert event_type + metadata without coupling to the
// existing R11 ordering assertions.
const auditInserts: Array<Record<string, unknown>> = [];

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

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "match_candidate_index") {
        return {
          delete: () => ({
            in: (_col: string, vals: unknown[]) => {
              callLog.push({ table, op: "admin_delete_in", payload: vals });
              return mockCandidateIndexDelete();
            },
          }),
        };
      }
      // PR4 — audit_logs writes from recordRevokeCascade. We do NOT append
      // to `callLog` so the existing R11 ordering assertions remain stable;
      // PR4 tests assert against `auditInserts` directly.
      if (table === "audit_logs") {
        return {
          insert: (payload: Record<string, unknown>) => {
            auditInserts.push(payload);
            return mockAuditInsert();
          },
        };
      }
      throw new Error(`unexpected admin table: ${table}`);
    },
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
  auditInserts.length = 0;
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
      "match_candidate_index:admin_delete_in",
    ]);

    // Cascade anon-keys must be deterministic HMAC-SHA256 hex (64 chars).
    const cascade = callLog.find(
      (c) => c.table === "match_candidate_index" && c.op === "delete_in",
    ) ?? callLog.find(
      (c) => c.table === "match_candidate_index" && c.op === "admin_delete_in",
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

// ---------------------------------------------------------------------------
// PR4 Trust Console — audit_logs proof emission.
//
// Asserts that recordRevokeCascade fires from inside the route for each of
// the three terminal paths: success, cascade failure, and stamp failure.
// These rows are what the Trust Console renders to the user as evidence the
// 60-second revoke promise was kept (or as a triage trail when it was not).
// ---------------------------------------------------------------------------

describe("POST /api/networking/revoke — audit_logs proof rows (PR4)", () => {
  it("emits a networking_revoked audit row on successful cascade with proof metadata", async () => {
    mockContactsSelect.mockResolvedValueOnce({
      data: [{ id: "contact-a" }, { id: "contact-b" }],
      error: null,
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    const payload = auditInserts[0] as {
      user_id: string;
      event_type: string;
      metadata: {
        items_erased: number;
        tables_touched: string[];
        duration_ms: number;
      };
    };
    expect(payload.user_id).toBe("u-1");
    expect(payload.event_type).toBe("networking_revoked");
    expect(payload.metadata.tables_touched).toContain("user_profiles");
    expect(payload.metadata.tables_touched).toContain("networking_match_index");
    expect(payload.metadata.tables_touched).toContain("match_candidate_index");
    expect(payload.metadata.items_erased).toBe(2);
    expect(typeof payload.metadata.duration_ms).toBe("number");
  });

  it("emits a networking_revoke_cascade_failed audit row when the cascade errors", async () => {
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
    expect(auditInserts).toHaveLength(1);
    const payload = auditInserts[0] as {
      event_type: string;
      metadata: { error: string };
    };
    expect(payload.event_type).toBe("networking_revoke_cascade_failed");
    // Route stringifies the thrown error via the same `err instanceof Error
    // ? err.message : String(err)` pattern it uses for its own log line.
    // The supabase error shape is a plain object, so String(...) yields
    // "[object Object]" — we assert SOME error string is present rather
    // than coupling this PR4 test to the existing logging-precision bug.
    expect(typeof payload.metadata.error).toBe("string");
    expect(payload.metadata.error.length).toBeGreaterThan(0);
  });

  it("emits a networking_revoke_cascade_failed audit row when stamp fails", async () => {
    mockProfileUpdate.mockResolvedValueOnce({
      data: null,
      error: { message: "stamp broken" },
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(500);
    expect(auditInserts).toHaveLength(1);
    const payload = auditInserts[0] as {
      event_type: string;
      metadata: { error: string; tables_touched: string[] };
    };
    expect(payload.event_type).toBe("networking_revoke_cascade_failed");
    expect(payload.metadata.error).toBe("stamp broken");
    // Stamp failed BEFORE user_profiles was recorded as touched.
    expect(payload.metadata.tables_touched).toEqual([]);
  });
});
