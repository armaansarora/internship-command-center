import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  fromSpy,
  getSupabaseAdminSpy,
  maybeSingleSpy,
  selectEqSpy,
  selectSpy,
  updateEqSpy,
  updateIsSpy,
  updateSpy,
  logWarnSpy,
} = vi.hoisted(() => {
  const maybeSingleSpy = vi.fn();
  const selectEqSpy = vi.fn(() => ({ maybeSingle: maybeSingleSpy }));
  const selectSpy = vi.fn(() => ({ eq: selectEqSpy }));
  const updateIsSpy = vi.fn();
  const updateEqSpy = vi.fn(() => ({ is: updateIsSpy }));
  const updateSpy = vi.fn(() => ({ eq: updateEqSpy }));
  const fromSpy = vi.fn(() => ({ select: selectSpy, update: updateSpy }));

  return {
    fromSpy,
    getSupabaseAdminSpy: vi.fn(() => ({ from: fromSpy })),
    maybeSingleSpy,
    selectEqSpy,
    selectSpy,
    updateEqSpy,
    updateIsSpy,
    updateSpy,
    logWarnSpy: vi.fn(),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: logWarnSpy,
  },
}));

import {
  isEmailAllowedForBeta,
  parseAllowedEmails,
} from "@/lib/auth/beta-gate";
import { _resetEnvCacheForTests } from "@/lib/env";

describe("parseAllowedEmails", () => {
  it("normalizes comma, semicolon, and whitespace separated emails", () => {
    expect(
      parseAllowedEmails(" OWNER@EXAMPLE.COM, friend@example.com\nthird@example.com;"),
    ).toEqual(
      new Set(["owner@example.com", "friend@example.com", "third@example.com"]),
    );
  });
});

describe("isEmailAllowedForBeta", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    };
    delete process.env.ALLOWED_EMAILS;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    _resetEnvCacheForTests();
    vi.clearAllMocks();
    maybeSingleSpy.mockResolvedValue({ data: null, error: null });
    updateIsSpy.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
    _resetEnvCacheForTests();
  });

  function setTestEnv(overrides: NodeJS.ProcessEnv): void {
    process.env = {
      ...process.env,
      ...overrides,
    };
  }

  it("keeps local dev/test usable when no explicit gate or service role is configured", async () => {
    await expect(isEmailAllowedForBeta("new@example.com")).resolves.toBe(true);
    expect(getSupabaseAdminSpy).not.toHaveBeenCalled();
  });

  it("always denies a missing email", async () => {
    await expect(isEmailAllowedForBeta(null)).resolves.toBe(false);
  });

  it("allows wildcard access outside production", async () => {
    process.env.ALLOWED_EMAILS = "owner@example.com,*";
    _resetEnvCacheForTests();

    await expect(isEmailAllowedForBeta("new@example.com")).resolves.toBe(true);
    expect(getSupabaseAdminSpy).not.toHaveBeenCalled();
  });

  it("ignores wildcard access in production private beta", async () => {
    setTestEnv({
      NODE_ENV: "production",
      ALLOWED_EMAILS: "*",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    _resetEnvCacheForTests();

    await expect(
      isEmailAllowedForBeta("uninvited@example.com", { userId: "user-1" }),
    ).resolves.toBe(false);

    expect(logWarnSpy).toHaveBeenCalledWith(
      "auth.beta_gate.production_wildcard_ignored",
      { mode: "waitlist" },
    );
    expect(selectEqSpy).toHaveBeenCalledWith("email", "uninvited@example.com");
  });

  it("allows exact normalized ALLOWED_EMAILS keys without a waitlist lookup", async () => {
    setTestEnv({
      NODE_ENV: "production",
      ALLOWED_EMAILS: "owner@example.com, invited@example.com",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    _resetEnvCacheForTests();

    await expect(
      isEmailAllowedForBeta(" Invited@Example.com ", { userId: "user-1" }),
    ).resolves.toBe(true);
    expect(getSupabaseAdminSpy).not.toHaveBeenCalled();
  });

  it("denies unlisted emails when the local gate is explicitly configured", async () => {
    process.env.ALLOWED_EMAILS = "owner@example.com";
    _resetEnvCacheForTests();

    await expect(isEmailAllowedForBeta("guest@example.com")).resolves.toBe(false);
    expect(getSupabaseAdminSpy).not.toHaveBeenCalled();
  });

  it("allows and claims invited waitlist rows in production", async () => {
    setTestEnv({
      NODE_ENV: "production",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    _resetEnvCacheForTests();
    maybeSingleSpy.mockResolvedValueOnce({
      data: {
        id: "invite-1",
        invited_at: "2026-05-08T12:00:00.000Z",
        invited_user_id: null,
      },
      error: null,
    });

    await expect(
      isEmailAllowedForBeta("Invited@Example.com", { userId: "user-1" }),
    ).resolves.toBe(true);

    expect(fromSpy).toHaveBeenCalledWith("waitlist_signups");
    expect(selectSpy).toHaveBeenCalledWith("id, invited_at, invited_user_id");
    expect(selectEqSpy).toHaveBeenCalledWith("email", "invited@example.com");
    expect(updateSpy).toHaveBeenCalledWith({ invited_user_id: "user-1" });
    expect(updateEqSpy).toHaveBeenCalledWith("id", "invite-1");
    expect(updateIsSpy).toHaveBeenCalledWith("invited_user_id", null);
  });

  it("denies pending waitlist rows that have not been invited", async () => {
    setTestEnv({
      NODE_ENV: "production",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    _resetEnvCacheForTests();
    maybeSingleSpy.mockResolvedValueOnce({
      data: {
        id: "invite-1",
        invited_at: null,
        invited_user_id: null,
      },
      error: null,
    });

    await expect(
      isEmailAllowedForBeta("pending@example.com", { userId: "user-1" }),
    ).resolves.toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("denies invites already claimed by a different auth user", async () => {
    setTestEnv({
      NODE_ENV: "production",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    _resetEnvCacheForTests();
    maybeSingleSpy.mockResolvedValueOnce({
      data: {
        id: "invite-1",
        invited_at: "2026-05-08T12:00:00.000Z",
        invited_user_id: "other-user",
      },
      error: null,
    });

    await expect(
      isEmailAllowedForBeta("invited@example.com", { userId: "user-1" }),
    ).resolves.toBe(false);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "auth.beta_gate.invite_claimed_by_different_user",
      { inviteId: "invite-1" },
    );
  });

  it("fails closed in production when the invite lookup is unavailable", async () => {
    setTestEnv({
      NODE_ENV: "production",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    _resetEnvCacheForTests();
    maybeSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST500" },
    });

    await expect(
      isEmailAllowedForBeta("guest@example.com", { userId: "user-1" }),
    ).resolves.toBe(false);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "auth.beta_gate.invite_lookup_failed",
      { code: "PGRST500" },
    );
  });
});
