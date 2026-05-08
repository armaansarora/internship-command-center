import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createGoogleLoginStateSpy,
  getGoogleLoginAuthUrlSpy,
  isProdSpy,
} = vi.hoisted(() => ({
  createGoogleLoginStateSpy: vi.fn(),
  getGoogleLoginAuthUrlSpy: vi.fn(),
  isProdSpy: vi.fn(),
}));

vi.mock("@/lib/auth/google-login-state", () => ({
  createGoogleLoginState: createGoogleLoginStateSpy,
  GOOGLE_LOGIN_STATE_COOKIE: "google_login_state",
  GOOGLE_LOGIN_STATE_COOKIE_MAX_AGE: 600,
}));

vi.mock("@/lib/auth/google-login-oauth", () => ({
  getGoogleLoginAuthUrl: getGoogleLoginAuthUrlSpy,
}));

vi.mock("@/lib/env", () => ({
  isProd: isProdSpy,
}));

const { GET } = await import("./route");

function request(path: string): NextRequest {
  return new NextRequest(`https://www.interntower.com${path}`);
}

describe("GET /api/auth/google/start", () => {
  beforeEach(() => {
    createGoogleLoginStateSpy.mockReset();
    getGoogleLoginAuthUrlSpy.mockReset();
    isProdSpy.mockReset();
    isProdSpy.mockReturnValue(true);
    createGoogleLoginStateSpy.mockReturnValue({
      cookieValue: "signed-cookie",
      nonce: "nonce",
      state: "state",
    });
    getGoogleLoginAuthUrlSpy.mockReturnValue(
      "https://accounts.google.com/o/oauth2/v2/auth?state=state",
    );
  });

  it("returns a Google URL and sets the login state cookie", async () => {
    const res = await GET(request("/api/auth/google/start?next=/settings"));

    expect(res.status).toBe(200);
    expect(createGoogleLoginStateSpy).toHaveBeenCalledWith("/settings");
    expect(getGoogleLoginAuthUrlSpy).toHaveBeenCalledWith({
      state: "state",
      nonce: "nonce",
    });
    await expect(res.json()).resolves.toEqual({
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=state",
    });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("google_login_state=signed-cookie");
    expect(cookie).toContain("Path=/api/gmail");
    expect(cookie).toContain("Max-Age=600");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
  });

  it("sanitizes unsafe next paths", async () => {
    await GET(request("/api/auth/google/start?next=https://evil.example"));

    expect(createGoogleLoginStateSpy).toHaveBeenCalledWith("/penthouse");
  });

  it("omits Secure outside production", async () => {
    isProdSpy.mockReturnValue(false);

    const res = await GET(request("/api/auth/google/start"));

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("google_login_state=signed-cookie");
    expect(cookie).not.toContain("Secure");
  });
});
