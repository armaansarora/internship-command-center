/**
 * Lobby routing tests.
 *
 * The middleware must allow authenticated guests to visit /lobby intentionally.
 * The Lobby is a real floor, and redirecting it to last_floor_visited created
 * a self-redirect when that value was "L".
 *
 * DB errors must fail-open — better to let the guest see the lobby than
 * break sign-in when Supabase hiccups.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

type ProfileRow = {
  arrival_played_at: string | null;
  last_floor_visited: string | null;
};

function mkClient(
  user: { id: string } | null,
  profile: ProfileRow | null,
  profileErr = false,
  authErr = false,
) {
  return {
    auth: {
      getUser: async () => {
        if (authErr) throw new Error("Supabase Auth returned HTML");
        return { data: { user } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            profileErr
              ? { data: null, error: { message: "db down" } }
              : { data: profile, error: null },
        }),
      }),
    }),
  };
}

let nextMockClient: unknown = null;
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => nextMockClient,
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

import { updateSession } from "./middleware";

function request(url: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(url), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("R4.9 lobby routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets an unauthenticated guest continue into /lobby (lobby is public)", async () => {
    nextMockClient = mkClient(null, null);
    const res = await updateSession(request("http://localhost/lobby"));
    // No redirect → normal NextResponse.next() with no Location header.
    expect(res.headers.get("location")).toBeNull();
  });

  it("does NOT fast-lane a first-visit authenticated guest (arrival not yet played)", async () => {
    nextMockClient = mkClient(
      { id: "user-new" },
      { arrival_played_at: null, last_floor_visited: "PH" },
    );
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets a returning guest intentionally visit /lobby as a real floor", async () => {
    nextMockClient = mkClient(
      { id: "user-pro" },
      {
        arrival_played_at: "2026-04-20T09:00:00.000Z",
        last_floor_visited: "PH",
      },
    );
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not self-redirect when the last visited floor is the Lobby", async () => {
    nextMockClient = mkClient(
      { id: "user-cro" },
      {
        arrival_played_at: "2026-04-20T09:00:00.000Z",
        last_floor_visited: "L",
      },
    );
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("fails open when the user_profiles read errors (guest still sees lobby)", async () => {
    nextMockClient = mkClient(
      { id: "user-glitch" },
      { arrival_played_at: "2026-04-20T09:00:00.000Z", last_floor_visited: "PH" },
      true, // simulate error
    );
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("fails open on public routes when Supabase Auth returns a non-JSON edge error", async () => {
    nextMockClient = mkClient(null, null, false, true);
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not ask Supabase for a user on public OAuth callback routes", async () => {
    const getUser = vi.fn(async () => ({ data: { user: null } }));
    nextMockClient = {
      auth: { getUser },
      from: vi.fn(),
    };

    const res = await updateSession(
      request("http://localhost/api/gmail/callback?code=abc&state=login_123"),
    );

    expect(res.headers.get("location")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("does not ask Supabase for a user before the signout route runs", async () => {
    const getUser = vi.fn(async () => ({ data: { user: null } }));
    nextMockClient = {
      auth: { getUser },
      from: vi.fn(),
    };

    const res = await updateSession(request("http://localhost/api/auth/signout"));

    expect(res.headers.get("location")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("redirects protected routes to the lobby when Supabase Auth cannot verify the session", async () => {
    nextMockClient = mkClient(null, null, false, true);
    const res = await updateSession(request("http://localhost/settings"));
    expect(res.headers.get("location")).toContain("/lobby");
  });

  it("returns JSON 401 for protected API routes when Supabase Auth cannot verify the session", async () => {
    nextMockClient = mkClient(null, null, false, true);
    const res = await updateSession(request("http://localhost/api/stripe/checkout"));
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
    });
  });

  it("clears malformed auth cookies on public routes before Supabase SSR can recover them", async () => {
    nextMockClient = mkClient({ id: "should-not-read" }, null, false, true);
    const res = await updateSession(
      request(
        "http://localhost/lobby",
        "sb-supabase-auth-token=base64-bm90LWpzb24",
      ),
    );
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("sb-supabase-auth-token")?.value).toBe("");
  });

  it("redirects protected routes with malformed auth cookies and clears the stale session", async () => {
    nextMockClient = mkClient({ id: "should-not-read" }, null, false, true);
    const res = await updateSession(
      request(
        "http://localhost/settings",
        "sb-supabase-auth-token=base64-bm90LWpzb24",
      ),
    );
    expect(res.headers.get("location")).toContain("/lobby");
    expect(res.cookies.get("sb-supabase-auth-token")?.value).toBe("");
  });

  it("returns JSON 401 for protected API routes with malformed auth cookies and clears them", async () => {
    nextMockClient = mkClient({ id: "should-not-read" }, null, false, true);
    const res = await updateSession(
      request(
        "http://localhost/api/stripe/portal",
        "sb-supabase-auth-token=base64-bm90LWpzb24",
      ),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("sb-supabase-auth-token")?.value).toBe("");
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
    });
  });

  it("does not fast-lane when path is not the lobby root (e.g. /penthouse)", async () => {
    nextMockClient = mkClient(
      { id: "user-anywhere" },
      {
        arrival_played_at: "2026-04-20T09:00:00.000Z",
        last_floor_visited: "PH",
      },
    );
    const res = await updateSession(request("http://localhost/penthouse"));
    // /penthouse is private, authenticated guest is allowed, no redirect.
    expect(res.headers.get("location")).toBeNull();
  });
});
