/**
 * R4.9 — returning-user fast-lane test.
 *
 * The middleware must redirect an authenticated guest landing on /lobby
 * to their last-visited floor IF they have already watched the cinematic
 * (arrival_played_at is stamped). First-time authenticated guests, who
 * still need the arrival, must continue into /lobby.
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

function mkClient(user: { id: string } | null, profile: ProfileRow | null, profileErr = false) {
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
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

function request(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

describe("R4.9 returning-user fast lane", () => {
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

  it("redirects a returning guest at /lobby to /penthouse when last_floor is PH", async () => {
    nextMockClient = mkClient(
      { id: "user-pro" },
      {
        arrival_played_at: "2026-04-20T09:00:00.000Z",
        last_floor_visited: "PH",
      },
    );
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toContain("/penthouse");
  });

  it("redirects to /war-room when last_floor was 7", async () => {
    nextMockClient = mkClient(
      { id: "user-cro" },
      {
        arrival_played_at: "2026-04-20T09:00:00.000Z",
        last_floor_visited: "7",
      },
    );
    const res = await updateSession(request("http://localhost/lobby"));
    expect(res.headers.get("location")).toContain("/war-room");
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
