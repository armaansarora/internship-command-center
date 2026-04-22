import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

/**
 * Contract tests for GET /api/cron/purge-sweeper.
 *
 * Auth coverage is separately verified by the integration audit in
 * `src/app/api/cron/__integration__/cron-auth.test.ts`. These tests focus on
 * the purge semantics:
 *   - 401 when verifyCronRequest rejects
 *   - Batch limit respected (capped at PURGE_BATCH_LIMIT = 10)
 *   - For each eligible user: delete from user_profiles, then delete auth user,
 *     then best-effort storage cleanup, then emit data_hard_deleted audit
 *     with SHA-256(email) tombstone
 *   - One user's failure does not halt the batch
 *   - data_hard_deleted audit includes email_hash (never the raw email)
 */

const {
  verifyCronSpy,
  selectFromSpy,
  notSpy,
  ltSpy,
  limitSpy,
  deleteFromSpy,
  deleteEqSpy,
  deleteAuthUserSpy,
  storageListSpy,
  storageRemoveSpy,
  auditSpy,
} = vi.hoisted(() => ({
  verifyCronSpy: vi.fn(),
  selectFromSpy: vi.fn(),
  notSpy: vi.fn(),
  ltSpy: vi.fn(),
  limitSpy: vi.fn(),
  deleteFromSpy: vi.fn(),
  deleteEqSpy: vi.fn(),
  deleteAuthUserSpy: vi.fn(),
  storageListSpy: vi.fn(),
  storageRemoveSpy: vi.fn(),
  auditSpy: vi.fn(),
}));

vi.mock("@/lib/auth/cron", () => ({
  verifyCronRequest: verifyCronSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      // R0.7 route uses from("user_profiles") for BOTH the eligibility select
      // and the per-user delete. We distinguish by the first method called
      // on the builder.
      return {
        select: () => {
          selectFromSpy(table);
          return {
            not: notSpy.mockReturnValue({
              lt: ltSpy.mockReturnValue({
                limit: limitSpy,
              }),
            }),
          };
        },
        delete: () => {
          deleteFromSpy(table);
          return { eq: deleteEqSpy };
        },
      };
    },
    auth: {
      admin: {
        deleteUser: deleteAuthUserSpy,
      },
    },
    storage: {
      from: (bucket: string) => ({
        list: (path: string) => storageListSpy(bucket, path),
        remove: (paths: string[]) => storageRemoveSpy(bucket, paths),
      }),
    },
  }),
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: auditSpy,
}));

// The route also pulls logger; let the real one run so we don't accidentally
// hide errors.
const { GET } = await import("./route");

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/purge-sweeper", {
    method: "GET",
    headers: { authorization: "Bearer secret" },
  });
}

function mockEligibleUsers(
  users: Array<{ id: string; email: string }>,
  error: { message: string } | null = null,
): void {
  limitSpy.mockResolvedValue({ data: error ? null : users, error });
}

describe("GET /api/cron/purge-sweeper", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeAll(() => {
    // The route calls log.info / log.warn which touches env(). Stub the bare
    // minimum so the validator doesn't reject.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-pub-key";
    _resetEnvCacheForTests();
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
    _resetEnvCacheForTests();
  });

  beforeEach(() => {
    verifyCronSpy.mockReset();
    selectFromSpy.mockReset();
    notSpy.mockReset();
    ltSpy.mockReset();
    limitSpy.mockReset();
    deleteFromSpy.mockReset();
    deleteEqSpy.mockReset();
    deleteAuthUserSpy.mockReset();
    storageListSpy.mockReset();
    storageRemoveSpy.mockReset();
    auditSpy.mockReset();

    // Defaults that each test can override.
    deleteEqSpy.mockResolvedValue({ error: null });
    deleteAuthUserSpy.mockResolvedValue({ error: null });
    storageListSpy.mockResolvedValue({ data: [], error: null });
    storageRemoveSpy.mockResolvedValue({ data: [], error: null });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyCronSpy.mockReturnValue({ ok: false, error: "missing secret" });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(selectFromSpy).not.toHaveBeenCalled();
  });

  it("queries user_profiles with deleted_at < (now - 30 days) and caps at 10", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([]);

    await GET(makeRequest());

    expect(selectFromSpy).toHaveBeenCalledWith("user_profiles");
    expect(notSpy).toHaveBeenCalledWith("deleted_at", "is", null);
    // Cutoff argument — just verify it's an ISO string in the past.
    const ltCall = ltSpy.mock.calls[0] as [string, string];
    expect(ltCall[0]).toBe("deleted_at");
    expect(() => new Date(ltCall[1]).toISOString()).not.toThrow();
    expect(new Date(ltCall[1]).getTime()).toBeLessThan(Date.now());
    expect(limitSpy).toHaveBeenCalledWith(10);
  });

  it("returns 500 if the eligibility select errors", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([], { message: "eligibility failed" });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("eligibility failed");
    expect(deleteFromSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("hard-deletes each eligible user and emits data_hard_deleted audit with email_hash", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([
      { id: "u-1", email: "alice@example.com" },
      { id: "u-2", email: "bob@example.com" },
    ]);
    storageListSpy.mockResolvedValue({
      data: [{ name: "one.zip" }, { name: "two.zip" }],
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { purged: number; failed: string[] };
    expect(body.purged).toBe(2);
    expect(body.failed).toEqual([]);

    // Both user_profiles rows deleted (per-user path).
    expect(deleteFromSpy).toHaveBeenCalledWith("user_profiles");
    expect(deleteEqSpy).toHaveBeenCalledWith("id", "u-1");
    expect(deleteEqSpy).toHaveBeenCalledWith("id", "u-2");

    // Both auth.users rows deleted (cascade from auth cleans nothing extra,
    // but we still call deleteUser as the spec requires).
    expect(deleteAuthUserSpy).toHaveBeenCalledWith("u-1");
    expect(deleteAuthUserSpy).toHaveBeenCalledWith("u-2");

    // Storage cleanup: listed per-user and removed listed files.
    expect(storageListSpy).toHaveBeenCalledWith("exports", "u-1");
    expect(storageListSpy).toHaveBeenCalledWith("exports", "u-2");
    expect(storageRemoveSpy).toHaveBeenCalledWith("exports", [
      "u-1/one.zip",
      "u-1/two.zip",
    ]);
    expect(storageRemoveSpy).toHaveBeenCalledWith("exports", [
      "u-2/one.zip",
      "u-2/two.zip",
    ]);

    // Audit events: both fire, neither includes the raw email.
    expect(auditSpy).toHaveBeenCalledTimes(2);
    for (const call of auditSpy.mock.calls) {
      const arg = call[0] as {
        userId: string;
        eventType: string;
        metadata: { email_hash: string };
      };
      expect(arg.eventType).toBe("data_hard_deleted");
      expect(arg.metadata.email_hash).toMatch(/^[0-9a-f]{16}$/);
      expect(arg.metadata.email_hash).not.toContain("@");
    }
  });

  it("skips storage.remove entirely when the user has no exports", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([{ id: "u-x", email: "x@example.com" }]);
    storageListSpy.mockResolvedValue({ data: [], error: null });

    await GET(makeRequest());

    expect(storageListSpy).toHaveBeenCalledWith("exports", "u-x");
    expect(storageRemoveSpy).not.toHaveBeenCalled();
    expect(auditSpy).toHaveBeenCalledTimes(1);
  });

  it("treats a single user's failure as isolated — the batch continues", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([
      { id: "u-bad", email: "bad@example.com" },
      { id: "u-ok", email: "ok@example.com" },
    ]);

    // First user_profiles delete throws, second succeeds.
    deleteEqSpy.mockImplementation((col: string, val: string) => {
      if (val === "u-bad") {
        return Promise.resolve({ error: { message: "rls reject" } });
      }
      return Promise.resolve({ error: null });
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { purged: number; failed: string[] };
    expect(body.purged).toBe(1);
    expect(body.failed).toEqual(["u-bad"]);

    // Second user was still audited; first was not.
    expect(auditSpy).toHaveBeenCalledTimes(1);
    const auditArg = auditSpy.mock.calls[0][0] as {
      userId: string;
      metadata: { email_hash: string };
    };
    expect(auditArg.userId).toBe("u-ok");
  });

  it("tolerates a storage-cleanup failure without failing the row", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([{ id: "u-only", email: "only@example.com" }]);
    // list() throws — our handler catches and warns, then continues.
    storageListSpy.mockRejectedValue(new Error("storage down"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { purged: number; failed: string[] };
    expect(body.purged).toBe(1);
    expect(body.failed).toEqual([]);

    // Audit still fires — storage is best-effort.
    expect(auditSpy).toHaveBeenCalledTimes(1);
  });

  it("bails the row and records a failure if auth.admin.deleteUser errors", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    mockEligibleUsers([{ id: "u-auth-fail", email: "af@example.com" }]);
    deleteAuthUserSpy.mockResolvedValue({ error: { message: "auth boom" } });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { purged: number; failed: string[] };
    expect(body.purged).toBe(0);
    expect(body.failed).toEqual(["u-auth-fail"]);
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
