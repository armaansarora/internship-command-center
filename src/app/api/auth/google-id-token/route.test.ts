import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  signInWithIdTokenSpy,
  signOutSpy,
  isEmailAllowedForBetaSpy,
  needsLobbyOnboardingAfterAuthSpy,
  logWarnSpy,
} = vi.hoisted(() => ({
  signInWithIdTokenSpy: vi.fn(),
  signOutSpy: vi.fn(),
  isEmailAllowedForBetaSpy: vi.fn(),
  needsLobbyOnboardingAfterAuthSpy: vi.fn(),
  logWarnSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithIdToken: signInWithIdTokenSpy,
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

const { POST } = await import("./route");

function request(body: unknown): Request {
  return new Request("https://www.interntower.com/api/auth/google-id-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/google-id-token", () => {
  beforeEach(() => {
    signInWithIdTokenSpy.mockReset();
    signOutSpy.mockReset();
    isEmailAllowedForBetaSpy.mockReset();
    needsLobbyOnboardingAfterAuthSpy.mockReset();
    logWarnSpy.mockReset();
    signOutSpy.mockResolvedValue({ error: null });
    needsLobbyOnboardingAfterAuthSpy.mockResolvedValue(false);
  });

  it("exchanges a Google ID token for a Supabase session", async () => {
    const user = {
      id: "user-1",
      email: "invited@example.com",
      user_metadata: { full_name: "Invited User" },
    };
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user, session: { user } },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(true);

    const res = await POST(request({
      credential: "jwt",
      next: "/settings",
      nonce: "raw-nonce",
    }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ next: "/settings" });
    expect(signInWithIdTokenSpy).toHaveBeenCalledWith({
      provider: "google",
      token: "jwt",
      nonce: "raw-nonce",
    });
    expect(needsLobbyOnboardingAfterAuthSpy).toHaveBeenCalledWith(
      expect.any(Object),
      user,
    );
    expect(signOutSpy).not.toHaveBeenCalled();
  });

  it("returns the lobby as the next path for first-run users", async () => {
    const user = { id: "user-1", email: "invited@example.com", user_metadata: {} };
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user, session: { user } },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(true);
    needsLobbyOnboardingAfterAuthSpy.mockResolvedValue(true);

    const res = await POST(request({ credential: "jwt" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ next: "/lobby" });
  });

  it("signs out and rejects users outside the beta gate", async () => {
    const user = { id: "user-1", email: "guest@example.com", user_metadata: {} };
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user, session: { user } },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(false);

    const res = await POST(request({ credential: "jwt" }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "beta_not_invited" });
    expect(signOutSpy).toHaveBeenCalledOnce();
    expect(needsLobbyOnboardingAfterAuthSpy).not.toHaveBeenCalled();
    expect(logWarnSpy).toHaveBeenCalledWith("auth.google_id_token.beta_gate_denied", {
      domain: "example.com",
    });
  });

  it("rejects malformed requests", async () => {
    const res = await POST(request({ credential: "" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_request" });
    expect(signInWithIdTokenSpy).not.toHaveBeenCalled();
  });

  it("rejects failed token exchanges", async () => {
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "invalid token" },
    });

    const res = await POST(request({ credential: "bad-jwt" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "auth_failed" });
    expect(isEmailAllowedForBetaSpy).not.toHaveBeenCalled();
    expect(needsLobbyOnboardingAfterAuthSpy).not.toHaveBeenCalled();
  });
});
