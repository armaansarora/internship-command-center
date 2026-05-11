import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for GET /api/account/export/status.
 *
 *   - 401 when unauthenticated.
 *   - Returns the user_profiles status when not delivered (queued /
 *     running / failed / idle) without listing Storage.
 *   - On delivered, lists the user's exports directory, creates a fresh
 *     signed URL, and returns it.
 *   - When the row is delivered but the artifact is missing, downgrades
 *     to a "failed" response so the client surfaces a retry CTA.
 */

const {
  requireUserSpy,
  fromSpy,
  storageListSpy,
  storageSignSpy,
  logErrorSpy,
  logWarnSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  fromSpy: vi.fn(),
  storageListSpy: vi.fn(),
  storageSignSpy: vi.fn(),
  logErrorSpy: vi.fn(),
  logWarnSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: fromSpy,
    storage: {
      from: () => ({
        list: storageListSpy,
        createSignedUrl: storageSignSpy,
      }),
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    error: logErrorSpy,
    warn: logWarnSpy,
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const { GET } = await import("./route");

interface ProfileRow {
  data_export_status: string | null;
  data_export_requested_at: string | null;
  data_export_last_delivered_at: string | null;
}

function mockProfile(row: ProfileRow | null, error: { message: string } | null = null): void {
  fromSpy.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: row, error }),
      }),
    }),
  });
}

const OK_AUTH = { ok: true as const, user: { id: "user-1" } };

describe("GET /api/account/export/status", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    fromSpy.mockReset();
    storageListSpy.mockReset();
    storageSignSpy.mockReset();
    logErrorSpy.mockReset();
    logWarnSpy.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "auth" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns idle when there is no profile row", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    mockProfile(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("idle");
    expect(body.downloadUrl).toBeNull();
  });

  it("returns queued + requestedAt when in flight", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    mockProfile({
      data_export_status: "queued",
      data_export_requested_at: "2026-05-10T00:00:00Z",
      data_export_last_delivered_at: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("queued");
    expect(body.requestedAtIso).toBe("2026-05-10T00:00:00Z");
    expect(body.downloadUrl).toBeNull();
    expect(storageListSpy).not.toHaveBeenCalled();
  });

  it("mints a fresh signed URL when status is delivered", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    mockProfile({
      data_export_status: "delivered",
      data_export_requested_at: "2026-05-10T00:00:00Z",
      data_export_last_delivered_at: "2026-05-10T00:05:00Z",
    });
    storageListSpy.mockResolvedValue({
      data: [{ name: "1715000000000.zip" }],
      error: null,
    });
    storageSignSpy.mockResolvedValue({
      data: { signedUrl: "https://stub.example/signed-url" },
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("delivered");
    expect(body.downloadUrl).toBe("https://stub.example/signed-url");
    expect(body.downloadExpiresAtIso).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    // The list call is scoped to the user's directory.
    expect(storageListSpy).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ limit: 25 }),
    );
    // Signed URL prefixed with userId/filename.
    expect(storageSignSpy).toHaveBeenCalledWith(
      "user-1/1715000000000.zip",
      expect.any(Number),
    );
  });

  it("downgrades to failed when delivered but no artifact present", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    mockProfile({
      data_export_status: "delivered",
      data_export_requested_at: null,
      data_export_last_delivered_at: null,
    });
    storageListSpy.mockResolvedValue({ data: [], error: null });

    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("failed");
    expect(body.downloadUrl).toBeNull();
    expect(logWarnSpy).toHaveBeenCalledWith(
      "account.export.status_no_artifact",
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it("falls back without a URL when signing fails (still delivered, no link)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    mockProfile({
      data_export_status: "delivered",
      data_export_requested_at: null,
      data_export_last_delivered_at: null,
    });
    storageListSpy.mockResolvedValue({
      data: [{ name: "abc.zip" }],
      error: null,
    });
    storageSignSpy.mockResolvedValue({
      data: null,
      error: { message: "sign down" },
    });

    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("delivered");
    expect(body.downloadUrl).toBeNull();
    expect(logWarnSpy).toHaveBeenCalledWith(
      "account.export.status_sign_failed",
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it("degrades to idle when the profile read fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    mockProfile(null, { message: "rls denied" });
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("idle");
    expect(logErrorSpy).toHaveBeenCalledWith(
      "account.export.status_read_failed",
      undefined,
      expect.objectContaining({ userId: "user-1", error: "rls denied" }),
    );
  });
});
