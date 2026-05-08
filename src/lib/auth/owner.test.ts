import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOwner } from "./owner";
import { _resetEnvCacheForTests } from "@/lib/env";

describe("isOwner", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    };
    delete process.env.OWNER_USER_ID;
    delete process.env.OWNER_USER_IDS;
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    _resetEnvCacheForTests();
  });

  it("allows the single configured owner id", () => {
    process.env.OWNER_USER_ID = "00000000-0000-4000-8000-000000000001";
    _resetEnvCacheForTests();

    expect(isOwner("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isOwner("00000000-0000-4000-8000-000000000002")).toBe(false);
  });

  it("allows additional launch-migration owner ids", () => {
    process.env.OWNER_USER_IDS =
      "00000000-0000-4000-8000-000000000001, 00000000-0000-4000-8000-000000000002";
    _resetEnvCacheForTests();

    expect(isOwner("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isOwner("00000000-0000-4000-8000-000000000002")).toBe(true);
    expect(isOwner("00000000-0000-4000-8000-000000000003")).toBe(false);
  });
});
