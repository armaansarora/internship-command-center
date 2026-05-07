import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    };
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    _resetEnvCacheForTests();
  });

  it("fails open when ALLOWED_EMAILS is unset", () => {
    delete process.env.ALLOWED_EMAILS;
    _resetEnvCacheForTests();

    expect(isEmailAllowedForBeta("new@example.com")).toBe(true);
  });

  it("allows wildcard access when ALLOWED_EMAILS contains *", () => {
    process.env.ALLOWED_EMAILS = "owner@example.com,*";
    _resetEnvCacheForTests();

    expect(isEmailAllowedForBeta("new@example.com")).toBe(true);
  });

  it("allows exact normalized matches", () => {
    process.env.ALLOWED_EMAILS = "owner@example.com, invited@example.com";
    _resetEnvCacheForTests();

    expect(isEmailAllowedForBeta(" Invited@Example.com ")).toBe(true);
  });

  it("denies missing or unlisted emails when the gate is configured", () => {
    process.env.ALLOWED_EMAILS = "owner@example.com";
    _resetEnvCacheForTests();

    expect(isEmailAllowedForBeta("guest@example.com")).toBe(false);
    expect(isEmailAllowedForBeta(null)).toBe(false);
  });
});
