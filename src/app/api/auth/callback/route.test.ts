import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  exchangeCodeForSessionSpy,
  signOutSpy,
  isEmailAllowedForBetaSpy,
  needsLobbyOnboardingAfterAuthSpy,
  logWarnSpy,
} = vi.hoisted(() => ({
  exchangeCodeForSessionSpy: vi.fn(),
  signOutSpy: vi.fn(),
  isEmailAllowedForBetaSpy: vi.fn(),
  needsLobbyOnboardingAfterAuthSpy: vi.fn(),
  logWarnSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionSpy,
      signOut: signOutSpy,
    },
  }),
}));

vi.mock("@/lib/auth/beta-gate", () => ({
  isEmailAllowedForBeta: isEmailAllowedForBetaSpy,
}));

vi.mock("@/lib/auth/post-auth-profile", () => ({
  needsLobbyOnboardingAfterAuth: needsLobbyOnboardingAfterAuthSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: logWarnSpy,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const { GET } = await import("./route");

function request(path: string): Request {
  return new Request(`https://www.interntower.com${path}`);
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSessionSpy.mockReset();
    signOutSpy.mockReset();
    isEmailAllowedForBetaSpy.mockReset();
    needsLobbyOnboardingAfterAuthSpy.mockReset();
    logWarnSpy.mockReset();
    signOutSpy.mockResolvedValue({ error: null });
    needsLobbyOnboardingAfterAuthSpy.mockResolvedValue(false);
  });

  it("redirects to the safe next path when the beta gate allows the user", async () => {
    exchangeCodeForSessionSpy.mockResolvedValue({
      data: {
        user: { email: "invited@example.com" },
        session: { user: { email: "invited@example.com" } },
      },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(true);

    const res = await GET(request("/api/auth/callback?code=abc&next=/settings"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://www.interntower.com/settings",
    );
    expect(isEmailAllowedForBetaSpy).toHaveBeenCalledWith("invited@example.com");
    expect(needsLobbyOnboardingAfterAuthSpy).toHaveBeenCalledWith(
      expect.any(Object),
      { email: "invited@example.com" },
    );
    expect(signOutSpy).not.toHaveBeenCalled();
  });

  it("redirects first-run users to the lobby for onboarding", async () => {
    exchangeCodeForSessionSpy.mockResolvedValue({
      data: {
        user: { email: "invited@example.com" },
        session: { user: { email: "invited@example.com" } },
      },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(true);
    needsLobbyOnboardingAfterAuthSpy.mockResolvedValue(true);

    const res = await GET(request("/api/auth/callback?code=abc"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.interntower.com/lobby");
  });

  it("signs out and redirects to the lobby when the email is not invited", async () => {
    exchangeCodeForSessionSpy.mockResolvedValue({
      data: {
        user: { email: "guest@example.com" },
        session: { user: { email: "guest@example.com" } },
      },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(false);

    const res = await GET(request("/api/auth/callback?code=abc"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://www.interntower.com/lobby?error=beta_not_invited",
    );
    expect(signOutSpy).toHaveBeenCalledOnce();
    expect(needsLobbyOnboardingAfterAuthSpy).not.toHaveBeenCalled();
    expect(logWarnSpy).toHaveBeenCalledWith("auth.callback.beta_gate_denied", {
      domain: "example.com",
    });
  });

  it("falls back to auth_failed when the Supabase code exchange fails", async () => {
    exchangeCodeForSessionSpy.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "bad code" },
    });

    const res = await GET(request("/api/auth/callback?code=bad"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://www.interntower.com/lobby?error=auth_failed",
    );
    expect(isEmailAllowedForBetaSpy).not.toHaveBeenCalled();
    expect(needsLobbyOnboardingAfterAuthSpy).not.toHaveBeenCalled();
    expect(signOutSpy).not.toHaveBeenCalled();
  });
});
