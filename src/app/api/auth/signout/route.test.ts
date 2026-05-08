import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextResponse } from "next/server";

const {
  getUserSpy,
  signOutSpy,
  rateLimitSpy,
  logWarnSpy,
} = vi.hoisted(() => ({
  getUserSpy: vi.fn(),
  signOutSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  logWarnSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: getUserSpy,
      signOut: signOutSpy,
    },
  }),
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
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

type ResponseWithCookies = Response & Pick<NextResponse, "cookies">;

async function postSignout(req: Request): Promise<ResponseWithCookies> {
  return (await POST(req)) as ResponseWithCookies;
}

function request(cookie?: string): Request {
  return new Request("https://www.interntower.com/api/auth/signout", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  });
}

describe("POST /api/auth/signout", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    getUserSpy.mockReset();
    signOutSpy.mockReset();
    rateLimitSpy.mockReset();
    logWarnSpy.mockReset();
    rateLimitSpy.mockResolvedValue({
      limited: false,
      headers: {},
      response: null,
    });
    signOutSpy.mockResolvedValue({ error: null });
  });

  it("rate-limits by user id when Supabase can verify the session", async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await postSignout(request());

    expect(rateLimitSpy).toHaveBeenCalledWith("user-1", "C");
    expect(signOutSpy).toHaveBeenCalledOnce();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.interntower.com/lobby");
  });

  it("redirects to the lobby and clears stale auth cookies when getUser fails", async () => {
    getUserSpy.mockRejectedValue(new Error("Supabase Auth operation timed out"));

    const res = await postSignout(
      request(
        "sb-project-ref-auth-token=abc; sb-project-ref-auth-token.0=chunk; sb-project-ref-auth-token-code-verifier=verifier",
      ),
    );

    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(signOutSpy).toHaveBeenCalledOnce();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.interntower.com/lobby");
    expect(res.cookies.get("sb-project-ref-auth-token")?.value).toBe("");
    expect(res.cookies.get("sb-project-ref-auth-token.0")?.value).toBe("");
    expect(res.cookies.get("sb-project-ref-auth-token-code-verifier")?.value).toBe("");
    expect(logWarnSpy).toHaveBeenCalledWith("auth.signout.get_user_failed", {
      error: "Supabase Auth operation timed out",
    });
  });

  it("still redirects and clears cookies when Supabase signOut fails", async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: "user-2" } } });
    signOutSpy.mockRejectedValue(new Error("fetch failed"));

    const res = await postSignout(request("sb-project-ref-auth-token=abc"));

    expect(res.status).toBe(302);
    expect(res.cookies.get("sb-project-ref-auth-token")?.value).toBe("");
    expect(logWarnSpy).toHaveBeenCalledWith("auth.signout.supabase_failed", {
      userId: "user-2",
      error: "fetch failed",
    });
  });
});
