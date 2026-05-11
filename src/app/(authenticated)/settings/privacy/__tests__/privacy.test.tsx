// @vitest-environment happy-dom

/**
 * Trust Console — route gate + server-action wiring tests.
 *
 * Covers the four requirements PR4-Frontend ships:
 *
 *   1. Flag off + non-owner → redirects to /settings.
 *   2. Flag off + owner     → renders (preview mode).
 *   3. Flag on  + any user  → renders.
 *   4. Server actions wire the underlying primitives:
 *        - revokeNetworkingConsentAction stamps user_profiles,
 *          purges match-index rows, and audit-logs the cascade.
 *        - requestDataExportAction queues the export + audit-logs.
 *        - requestDataDeleteAction soft-deletes + audit-logs IFF
 *          confirmEmail matches; otherwise short-circuits.
 *
 * Mocks every external boundary so the suite runs in-memory.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RecordRevokeCascadeInput } from "@/lib/audit/consent-events";
import type { AuditEvent } from "@/lib/audit/log";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  getUserMock,
  isOwnerMock,
  trustConsoleFlagMock,
  redirectMock,
  getUserAuditTimelineMock,
  getUserConsentStateMock,
  getRevokePreviewMock,
  fromMock,
  adminFromMock,
  logSecurityEventMock,
  recordRevokeCascadeMock,
  counterpartyAnonKeyMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isOwnerMock: vi.fn(),
  trustConsoleFlagMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getUserAuditTimelineMock: vi.fn(),
  getUserConsentStateMock: vi.fn(),
  getRevokePreviewMock: vi.fn(),
  fromMock: vi.fn(),
  adminFromMock: vi.fn(),
  logSecurityEventMock: vi.fn(async (_event: AuditEvent) => undefined),
  recordRevokeCascadeMock: vi.fn(
    async (_input: RecordRevokeCascadeInput) => undefined,
  ),
  counterpartyAnonKeyMock: vi.fn((id: string) => `anon-${id}`),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getUser: getUserMock,
  createClient: vi.fn(async () => ({
    from: (table: string) => fromMock(table),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => adminFromMock(table),
  }),
}));

vi.mock("@/lib/auth/owner", () => ({
  isOwner: isOwnerMock,
}));

vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    flags: {
      trustConsoleEnabled: trustConsoleFlagMock,
    },
  },
}));

vi.mock("@/lib/db/queries/trust-console-rest", () => ({
  getUserAuditTimeline: getUserAuditTimelineMock,
  getUserConsentState: getUserConsentStateMock,
  getRevokePreview: getRevokePreviewMock,
  REVOKE_PREVIEW_EMPTY: {
    itemsToErase: 0,
    tablesTouched: ["user_profiles"],
  },
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: logSecurityEventMock,
}));

vi.mock("@/lib/audit/consent-events", () => ({
  recordRevokeCascade: recordRevokeCascadeMock,
}));

vi.mock("@/lib/networking/match-anon", () => ({
  counterpartyAnonKey: counterpartyAnonKeyMock,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/account/delete", () => ({
  GRACE_WINDOW_DAYS: 30,
  scheduledPurgeAt: (iso: string) => {
    const t = new Date(iso).getTime() + 30 * 24 * 60 * 60 * 1000;
    return new Date(t).toISOString();
  },
}));

// ---------------------------------------------------------------------------
// Helpers — Supabase query-builder stub
// ---------------------------------------------------------------------------

interface QueryStub {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>;
}

function makeQuery(result: { data?: unknown; error?: unknown; count?: number }): QueryStub {
  const stub: Partial<QueryStub> = {};
  stub.select = vi.fn(() => stub as QueryStub);
  stub.update = vi.fn(() => stub as QueryStub);
  stub.delete = vi.fn(() => stub as QueryStub);
  stub.insert = vi.fn(() => stub as QueryStub);
  stub.eq = vi.fn(() => stub as QueryStub);
  stub.in = vi.fn(() => stub as QueryStub);
  stub.single = vi.fn(async () => result);
  stub.maybeSingle = vi.fn(async () => result);
  stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
  return stub as QueryStub;
}

beforeEach(() => {
  vi.clearAllMocks();
  trustConsoleFlagMock.mockReturnValue(false);
  isOwnerMock.mockReturnValue(false);
  getUserMock.mockResolvedValue({ id: "u1", email: "alice@example.com" });
  getUserConsentStateMock.mockResolvedValue({
    networking: {
      state: "opted_in",
      sinceIso: "2026-05-01T00:00:00Z",
      consentVersion: 2,
    },
  });
  getUserAuditTimelineMock.mockResolvedValue([]);
  getRevokePreviewMock.mockResolvedValue({
    itemsToErase: 0,
    tablesTouched: ["user_profiles"],
  });
  fromMock.mockImplementation(() => makeQuery({ data: null, error: null }));
  adminFromMock.mockImplementation(() =>
    makeQuery({ data: { id: "u1" }, error: null, count: 0 }),
  );
});

// ---------------------------------------------------------------------------
// Page route-gate tests
// ---------------------------------------------------------------------------

describe("GET /settings/privacy route gate", () => {
  it("redirects to /lobby when the caller is not signed in", async () => {
    getUserMock.mockResolvedValue(null);
    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/REDIRECT:\/lobby/);
  });

  it("redirects to /settings when the trust-console flag is off and caller is not the owner", async () => {
    trustConsoleFlagMock.mockReturnValue(false);
    isOwnerMock.mockReturnValue(false);
    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/REDIRECT:\/settings/);
  });

  it("renders when the trust-console flag is on", async () => {
    trustConsoleFlagMock.mockReturnValue(true);
    isOwnerMock.mockReturnValue(false);
    fromMock.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        return makeQuery({
          data: { google_tokens: null, networking_revoked_at: null },
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });
    const { default: Page } = await import("../page");
    const element = await Page();
    expect(element).toBeTruthy();
    expect(getUserConsentStateMock).toHaveBeenCalledWith(
      expect.anything(),
      "u1",
    );
    expect(getUserAuditTimelineMock).toHaveBeenCalledWith(
      expect.anything(),
      "u1",
      { limit: 100 },
    );
  });

  it("renders for the owner even when the flag is off (preview)", async () => {
    trustConsoleFlagMock.mockReturnValue(false);
    isOwnerMock.mockReturnValue(true);
    fromMock.mockImplementation(() =>
      makeQuery({
        data: { google_tokens: "encrypted", networking_revoked_at: null },
        error: null,
      }),
    );
    const { default: Page } = await import("../page");
    const element = await Page();
    expect(element).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

describe("revokeNetworkingConsentAction", () => {
  it("returns unauthenticated when no user session is present", async () => {
    getUserMock.mockResolvedValue(null);
    const { revokeNetworkingConsentAction } = await import("../actions");
    const result = await revokeNetworkingConsentAction();
    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(recordRevokeCascadeMock).not.toHaveBeenCalled();
  });

  it("runs the three-step cascade and audit-logs the success on the happy path", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        return makeQuery({ data: null, error: null });
      }
      if (table === "networking_match_index") {
        return makeQuery({ data: null, error: null, count: 3 });
      }
      if (table === "contacts") {
        return makeQuery({
          data: [{ id: "c1" }, { id: "c2" }],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });
    adminFromMock.mockImplementation((table: string) => {
      if (table === "match_candidate_index") {
        return makeQuery({ data: null, error: null, count: 7 });
      }
      return makeQuery({ data: null, error: null });
    });

    const { revokeNetworkingConsentAction } = await import("../actions");
    const result = await revokeNetworkingConsentAction();

    expect(result).toEqual({ ok: true, itemsErased: 10 });
    expect(fromMock).toHaveBeenCalledWith("user_profiles");
    expect(fromMock).toHaveBeenCalledWith("networking_match_index");
    expect(fromMock).toHaveBeenCalledWith("contacts");
    expect(adminFromMock).toHaveBeenCalledWith("match_candidate_index");
    expect(counterpartyAnonKeyMock).toHaveBeenCalledTimes(2);

    expect(recordRevokeCascadeMock).toHaveBeenCalledTimes(1);
    const args = recordRevokeCascadeMock.mock.calls[0][0];
    expect(args.userId).toBe("u1");
    expect(args.itemsErased).toBe(10);
    expect(args.tablesTouched).toEqual([
      "user_profiles",
      "networking_match_index",
      "match_candidate_index",
    ]);
    expect("error" in args).toBe(false);
  });

  it("audit-logs a cascade failure when step 1 errors", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        return makeQuery({ data: null, error: { message: "rls denied" } });
      }
      return makeQuery({ data: null, error: null });
    });
    const { revokeNetworkingConsentAction } = await import("../actions");
    const result = await revokeNetworkingConsentAction();
    expect(result).toEqual({ ok: false, error: "rls denied" });
    expect(recordRevokeCascadeMock).toHaveBeenCalledTimes(1);
    const args = recordRevokeCascadeMock.mock.calls[0][0];
    expect(args.error).toBe("rls denied");
  });
});

describe("requestDataExportAction", () => {
  it("returns unauthenticated when no user session is present", async () => {
    getUserMock.mockResolvedValue(null);
    const { requestDataExportAction } = await import("../actions");
    const result = await requestDataExportAction();
    expect(result).toEqual({ ok: false, error: "unauthenticated" });
  });

  it("queues an export and emits a data_exported audit row", async () => {
    adminFromMock.mockImplementation(() =>
      makeQuery({ data: { id: "u1" }, error: null }),
    );
    const { requestDataExportAction } = await import("../actions");
    const result = await requestDataExportAction();
    expect(result).toEqual({ ok: true, queued: true });
    expect(adminFromMock).toHaveBeenCalledWith("user_profiles");
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        eventType: "data_exported",
        metadata: expect.objectContaining({
          stage: "queued",
          source: "trust_console",
        }),
      }),
    );
  });

  it("returns an error when the update fails", async () => {
    adminFromMock.mockImplementation(() =>
      makeQuery({ data: null, error: { message: "db down" } }),
    );
    const { requestDataExportAction } = await import("../actions");
    const result = await requestDataExportAction();
    expect(result).toEqual({ ok: false, error: "db down" });
    expect(logSecurityEventMock).not.toHaveBeenCalled();
  });
});

describe("requestDataDeleteAction", () => {
  it("returns unauthenticated when no user session is present", async () => {
    getUserMock.mockResolvedValue(null);
    const { requestDataDeleteAction } = await import("../actions");
    const result = await requestDataDeleteAction({ confirmEmail: "x" });
    expect(result).toEqual({ ok: false, error: "unauthenticated" });
  });

  it("rejects mismatched confirmEmail without touching the database", async () => {
    const { requestDataDeleteAction } = await import("../actions");
    const result = await requestDataDeleteAction({
      confirmEmail: "wrong@example.com",
    });
    expect(result).toEqual({ ok: false, error: "email_mismatch" });
    expect(adminFromMock).not.toHaveBeenCalled();
    expect(logSecurityEventMock).not.toHaveBeenCalled();
  });

  it("soft-deletes and audit-logs on a matching email", async () => {
    adminFromMock.mockImplementation(() =>
      makeQuery({ data: null, error: null }),
    );
    const { requestDataDeleteAction } = await import("../actions");
    const result = await requestDataDeleteAction({
      confirmEmail: "alice@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scheduledDeletionAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    }
    expect(adminFromMock).toHaveBeenCalledWith("user_profiles");
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        eventType: "data_delete_requested",
        metadata: expect.objectContaining({
          window_days: 30,
          source: "trust_console",
        }),
      }),
    );
  });
});
