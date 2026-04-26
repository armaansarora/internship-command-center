/**
 * bootstrap-discovery route contract test.
 *
 * Locks the route surface: auth gate, response shape, error passthrough
 * from the underlying discovery runner. Full pipeline integration lives
 * in the R4.11 Proof test.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
}));

const runBootstrapMock = vi.fn();
vi.mock("@/lib/onboarding/bootstrap", () => ({
  runBootstrapDiscovery: (...args: unknown[]) => runBootstrapMock(...args),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "./route";

function makeRequest(): Request {
  return new Request("http://localhost/api/onboarding/bootstrap-discovery", {
    method: "POST",
  });
}

describe("POST /api/onboarding/bootstrap-discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("invokes runBootstrapDiscovery with the authenticated user id", async () => {
    getUserMock.mockResolvedValueOnce({ id: "user-42" });
    runBootstrapMock.mockResolvedValueOnce({
      ok: true,
      newApplications: 6,
      candidatesSeen: 34,
      topScore: 0.87,
      durationMs: 12340,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(runBootstrapMock).toHaveBeenCalledWith("user-42");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.newApplications).toBe(6);
    expect(body.candidatesSeen).toBe(34);
    expect(body.topScore).toBe(0.87);
    expect(body.durationMs).toBe(12340);
  });

  it("returns a 500 with the underlying error when discovery fails", async () => {
    getUserMock.mockResolvedValueOnce({ id: "user-x" });
    runBootstrapMock.mockResolvedValueOnce({
      ok: false,
      newApplications: 0,
      candidatesSeen: 0,
      topScore: null,
      durationMs: 1200,
      error: "Greenhouse 503",
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Greenhouse 503");
  });
});
