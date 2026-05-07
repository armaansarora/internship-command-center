import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { needsLobbyOnboardingAfterAuth } from "@/lib/auth/post-auth-profile";

const { logWarnSpy } = vi.hoisted(() => ({
  logWarnSpy: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: logWarnSpy,
  },
}));

interface FakeClientOptions {
  upsertError?: { message: string } | null;
  stateError?: { message: string } | null;
  state?: {
    arrival_played_at: string | null;
    concierge_completed_at: string | null;
  } | null;
}

function fakeSupabase(options: FakeClientOptions = {}) {
  const upsertSpy = vi.fn().mockResolvedValue({
    error: options.upsertError ?? null,
  });
  const singleSpy = vi.fn().mockResolvedValue({
    data: options.state ?? {
      arrival_played_at: null,
      concierge_completed_at: null,
    },
    error: options.stateError ?? null,
  });
  const eqSpy = vi.fn(() => ({ single: singleSpy }));
  const selectSpy = vi.fn(() => ({ eq: eqSpy }));
  const fromSpy = vi.fn(() => ({
    upsert: upsertSpy,
    select: selectSpy,
  }));

  return {
    client: { from: fromSpy } as unknown as SupabaseClient,
    fromSpy,
    upsertSpy,
    selectSpy,
    eqSpy,
  };
}

describe("needsLobbyOnboardingAfterAuth", () => {
  beforeEach(() => {
    logWarnSpy.mockReset();
  });

  it("ensures the profile row from auth metadata before reading onboarding state", async () => {
    const supabase = fakeSupabase({
      state: {
        arrival_played_at: "2026-05-07T20:00:00.000Z",
        concierge_completed_at: "2026-05-07T20:02:00.000Z",
      },
    });

    await expect(
      needsLobbyOnboardingAfterAuth(supabase.client, {
        id: "user-1",
        email: "invited@example.com",
        user_metadata: {
          full_name: "Invited User",
          avatar_url: "https://example.com/avatar.png",
        },
      }),
    ).resolves.toBe(false);

    expect(supabase.fromSpy).toHaveBeenCalledWith("user_profiles");
    expect(supabase.upsertSpy).toHaveBeenCalledWith(
      {
        id: "user-1",
        email: "invited@example.com",
        display_name: "Invited User",
        avatar_url: "https://example.com/avatar.png",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    expect(supabase.selectSpy).toHaveBeenCalledWith(
      "arrival_played_at, concierge_completed_at",
    );
    expect(supabase.eqSpy).toHaveBeenCalledWith("id", "user-1");
  });

  it("requires lobby onboarding when either first-run timestamp is missing", async () => {
    const supabase = fakeSupabase({
      state: {
        arrival_played_at: "2026-05-07T20:00:00.000Z",
        concierge_completed_at: null,
      },
    });

    await expect(
      needsLobbyOnboardingAfterAuth(supabase.client, {
        id: "user-1",
        email: "invited@example.com",
        user_metadata: {},
      }),
    ).resolves.toBe(true);
  });

  it("fails closed to lobby onboarding when profile creation or reads fail", async () => {
    const upsertFailure = fakeSupabase({
      upsertError: { message: "insert denied" },
    });
    await expect(
      needsLobbyOnboardingAfterAuth(upsertFailure.client, {
        id: "user-1",
        email: "invited@example.com",
        user_metadata: {},
      }),
    ).resolves.toBe(true);

    const readFailure = fakeSupabase({
      stateError: { message: "missing row" },
    });
    await expect(
      needsLobbyOnboardingAfterAuth(readFailure.client, {
        id: "user-1",
        email: "invited@example.com",
        user_metadata: {},
      }),
    ).resolves.toBe(true);

    expect(logWarnSpy).toHaveBeenCalledTimes(2);
  });
});
