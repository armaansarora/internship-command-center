/**
 * Contract tests for GET /api/cron/job-discovery.
 * Auth covered by integration audit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const listUsersMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/job-discovery-rest", () => ({
  listUserIdsWithTargetProfile: listUsersMock,
}));

const runDiscoveryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/jobs/discovery", () => ({
  runJobDiscoveryForUser: runDiscoveryMock,
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/job-discovery", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/job-discovery", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    listUsersMock.mockReset();
    runDiscoveryMock.mockReset();
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("returns empty results when no users have target profiles", async () => {
    listUsersMock.mockResolvedValue([]);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: number; totalNew: number; results: unknown[] };
    expect(body.users).toBe(0);
    expect(body.totalNew).toBe(0);
    expect(body.results).toEqual([]);
  });

  it("aggregates newApplications across users", async () => {
    listUsersMock.mockResolvedValue(["user-a", "user-b"]);
    runDiscoveryMock.mockImplementation(async (userId: string) => {
      if (userId === "user-a") return { newApplications: 3, candidatesSeen: 10, topScore: 0.9 };
      return { newApplications: 2, candidatesSeen: 7, topScore: 0.85 };
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { totalNew: number };
    expect(body.totalNew).toBe(5);
  });

  it("isolates per-user failures and continues the batch", async () => {
    listUsersMock.mockResolvedValue(["user-a", "user-b"]);
    runDiscoveryMock.mockImplementation(async (userId: string) => {
      if (userId === "user-a") throw new Error("user-a blew up");
      return { newApplications: 2, candidatesSeen: 7, topScore: 0.85 };
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      totalNew: number;
      results: Array<{ userId: string; newApplications: number; error?: string }>;
    };
    expect(body.totalNew).toBe(2);
    const failed = body.results.find((r) => r.userId === "user-a");
    const ok = body.results.find((r) => r.userId === "user-b");
    expect(failed?.error).toBe("user-a blew up");
    expect(failed?.newApplications).toBe(0);
    expect(ok?.newApplications).toBe(2);
  });
});
