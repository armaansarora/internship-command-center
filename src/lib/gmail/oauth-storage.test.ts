import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_MASTER_HEX = "b".repeat(64);

const {
  createClientSpy,
  getSupabaseAdminSpy,
  updateSpy,
  updateEqSpy,
  updateSelectSpy,
  updateSingleSpy,
  selectSpy,
  selectEqSpy,
  selectSingleSpy,
  fetchSpy,
} = vi.hoisted(() => ({
  createClientSpy: vi.fn(),
  getSupabaseAdminSpy: vi.fn(),
  updateSpy: vi.fn(),
  updateEqSpy: vi.fn(),
  updateSelectSpy: vi.fn(),
  updateSingleSpy: vi.fn(),
  selectSpy: vi.fn(),
  selectEqSpy: vi.fn(),
  selectSingleSpy: vi.fn(),
  fetchSpy: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: <K extends string>(keys: readonly K[]) => {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = key === "ENCRYPTION_KEY" ? TEST_MASTER_HEX : "test-value";
    }
    return result as { [P in K]: string };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminSpy,
}));

vi.mock("@/lib/auth/oauth-state", () => ({
  createOAuthState: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { storeGoogleTokens, revokeGoogleTokens } = await import("./oauth");

function makeSupabaseClient() {
  return {
    from: (table: string) => {
      expect(table).toBe("user_profiles");
      return {
        update: updateSpy,
        select: selectSpy,
      };
    },
  };
}

describe("Google token storage", () => {
  beforeEach(() => {
    createClientSpy.mockReset();
    getSupabaseAdminSpy.mockReset();
    updateSpy.mockReset();
    updateEqSpy.mockReset();
    updateSelectSpy.mockReset();
    updateSingleSpy.mockReset();
    selectSpy.mockReset();
    selectEqSpy.mockReset();
    selectSingleSpy.mockReset();
    fetchSpy.mockReset();

    globalThis.fetch = fetchSpy;
    getSupabaseAdminSpy.mockReturnValue(makeSupabaseClient());
    createClientSpy.mockResolvedValue(makeSupabaseClient());

    updateSpy.mockReturnValue({ eq: updateEqSpy });
    updateEqSpy.mockReturnValue({ select: updateSelectSpy });
    updateSelectSpy.mockReturnValue({ single: updateSingleSpy });
    updateSingleSpy.mockResolvedValue({ data: { id: "user-google" }, error: null });

    selectSpy.mockReturnValue({ eq: selectEqSpy });
    selectEqSpy.mockReturnValue({ single: selectSingleSpy });
    selectSingleSpy.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });
  });

  it("confirms a profile row was updated when storing Google tokens", async () => {
    await storeGoogleTokens("user-google", {
      access_token: "access",
      refresh_token: "refresh",
      expiry_date: 123,
    });

    expect(updateSpy).toHaveBeenCalledWith({
      google_tokens: expect.stringMatching(/^v2:/),
    });
    expect(updateEqSpy).toHaveBeenCalledWith("id", "user-google");
    expect(updateSelectSpy).toHaveBeenCalledWith("id");
    expect(updateSingleSpy).toHaveBeenCalledOnce();
  });

  it("throws when storing tokens does not update a profile row", async () => {
    updateSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "No rows found" },
    });

    await expect(
      storeGoogleTokens("missing-user", {
        access_token: "access",
        refresh_token: "refresh",
        expiry_date: 123,
      }),
    ).rejects.toThrow("Failed to store Google tokens: No rows found");
  });

  it("confirms a profile row was updated when disconnecting Google", async () => {
    await revokeGoogleTokens("user-google");

    expect(updateSpy).toHaveBeenCalledWith({ google_tokens: null });
    expect(updateEqSpy).toHaveBeenCalledWith("id", "user-google");
    expect(updateSelectSpy).toHaveBeenCalledWith("id");
    expect(updateSingleSpy).toHaveBeenCalledOnce();
  });

  it("throws when disconnecting Google does not update a profile row", async () => {
    updateSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "No rows found" },
    });

    await expect(revokeGoogleTokens("missing-user")).rejects.toThrow(
      "Failed to clear Google tokens: No rows found",
    );
  });
});
