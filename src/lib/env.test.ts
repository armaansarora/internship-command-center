import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env, requireEnv, _resetEnvCacheForTests } from "./env";

describe("env", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
    _resetEnvCacheForTests();
  });

  it("throws when required Supabase vars are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(() => env()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("requireEnv surfaces missing optional vars", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => requireEnv(["STRIPE_SECRET_KEY"] as const)).toThrow(
      /STRIPE_SECRET_KEY/
    );
  });

  it("requireEnv returns values for present vars", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    const vals = requireEnv(["STRIPE_SECRET_KEY"] as const);
    expect(vals.STRIPE_SECRET_KEY).toBe("sk_test_abc");
  });
});
