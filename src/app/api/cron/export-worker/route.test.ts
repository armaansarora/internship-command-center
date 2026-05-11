/**
 * Contract tests for GET /api/cron/export-worker.
 * Auth covered by integration audit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const buildUserExportMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/export", () => ({ buildUserExport: buildUserExportMock }));

const sendExportEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/send-export", () => ({ sendExportEmail: sendExportEmailMock }));

const logSecurityEventMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/audit/log", () => ({ logSecurityEvent: logSecurityEventMock }));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fixture = {
  queued: [] as Array<{ id: string; email: string }>,
  queuedError: null as { message: string } | null,
  uploadError: null as { message: string } | null,
  signedUrlError: null as { message: string } | null,
  signedUrlData: { signedUrl: "https://signed.example/exports/u.zip" } as { signedUrl: string } | null,
  updates: [] as Array<{ userId: string; patch: Record<string, unknown> }>,
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "user_profiles") throw new Error(`Unexpected ${table}`);
      return {
        select: () => ({
          eq: () => ({
            limit: async () => ({
              data: fixture.queuedError ? null : fixture.queued,
              error: fixture.queuedError,
            }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, id: string) => {
            fixture.updates.push({ userId: id, patch });
            return { data: null, error: null };
          },
        }),
      };
    },
    storage: {
      from: () => ({
        upload: async () => ({
          data: fixture.uploadError ? null : { path: "x.zip" },
          error: fixture.uploadError,
        }),
        createSignedUrl: async () => ({
          data: fixture.signedUrlError ? null : fixture.signedUrlData,
          error: fixture.signedUrlError,
        }),
      }),
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/export-worker", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/export-worker", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    buildUserExportMock.mockReset();
    sendExportEmailMock.mockReset();
    logSecurityEventMock.mockReset();
    fixture.queued = [];
    fixture.queuedError = null;
    fixture.uploadError = null;
    fixture.signedUrlError = null;
    fixture.signedUrlData = { signedUrl: "https://signed.example/exports/u.zip" };
    fixture.updates = [];
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when queued fetch errors", async () => {
    fixture.queuedError = { message: "db broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("delivers one queued export end-to-end", async () => {
    fixture.queued = [{ id: "user-a", email: "a@example.com" }];
    buildUserExportMock.mockResolvedValue(Buffer.from("zipbytes"));
    sendExportEmailMock.mockResolvedValue(undefined);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { processed: number; results: Array<{ status: string }> };
    expect(body.processed).toBe(1);
    expect(body.results[0]?.status).toBe("delivered");
    expect(sendExportEmailMock).toHaveBeenCalledWith({
      to: "a@example.com",
      signedUrl: "https://signed.example/exports/u.zip",
    });
    const statusPatches = fixture.updates
      .filter((u) => u.userId === "user-a")
      .map((u) => u.patch.data_export_status);
    expect(statusPatches).toEqual(["running", "delivered"]);
    expect(logSecurityEventMock).toHaveBeenCalledWith({
      userId: "user-a",
      eventType: "data_exported",
      metadata: expect.objectContaining({
        stage: "delivered",
        path: expect.stringMatching(/^user-a\/\d+\.zip$/),
      }),
    });
    // No raw email in audit metadata.
    const auditMeta = logSecurityEventMock.mock.calls[0]?.[0]?.metadata ?? {};
    expect(JSON.stringify(auditMeta)).not.toContain("a@example.com");
  });

  it("flips to failed when upload errors", async () => {
    fixture.queued = [{ id: "user-a", email: "a@example.com" }];
    fixture.uploadError = { message: "S3 down" };
    buildUserExportMock.mockResolvedValue(Buffer.from("z"));
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { results: Array<{ status: string; error?: string }> };
    expect(body.results[0]?.status).toBe("failed");
    expect(body.results[0]?.error).toContain("S3 down");
    expect(sendExportEmailMock).not.toHaveBeenCalled();
    const patches = fixture.updates
      .filter((u) => u.userId === "user-a")
      .map((u) => u.patch.data_export_status);
    expect(patches).toContain("running");
    expect(patches).toContain("failed");
  });

  it("isolates per-user failures across the batch", async () => {
    fixture.queued = [
      { id: "user-a", email: "a@example.com" },
      { id: "user-b", email: "b@example.com" },
    ];
    buildUserExportMock.mockImplementation(async (userId: string) => {
      if (userId === "user-a") throw new Error("a broke");
      return Buffer.from("z");
    });
    sendExportEmailMock.mockResolvedValue(undefined);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { processed: number; results: Array<{ userId: string; status: string }> };
    expect(body.processed).toBe(2);
    const a = body.results.find((r) => r.userId === "user-a");
    const b = body.results.find((r) => r.userId === "user-b");
    expect(a?.status).toBe("failed");
    expect(b?.status).toBe("delivered");
  });
});
