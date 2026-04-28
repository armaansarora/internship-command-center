import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronRequest } from "./cron";
import { _resetEnvCacheForTests } from "@/lib/env";

describe("verifyCronRequest", () => {
  const originalSecret = process.env.CRON_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
    Object.assign(process.env, { NODE_ENV: originalNodeEnv });
    _resetEnvCacheForTests();
  });

  it("allows missing secret in development", () => {
    delete process.env.CRON_SECRET;
    Object.assign(process.env, { NODE_ENV: "development" });
    _resetEnvCacheForTests();
    const req = new Request("https://example.com/api/cron/x");
    expect(verifyCronRequest(req).ok).toBe(true);
  });

  it("rejects a mismatched bearer", () => {
    process.env.CRON_SECRET = "correct-horse-staple-battery";
    _resetEnvCacheForTests();
    const req = new Request("https://example.com/api/cron/x", {
      headers: { authorization: "Bearer wrong-but-same-length-aaaaaa" },
    });
    expect(verifyCronRequest(req).ok).toBe(false);
  });

  it("accepts a matching bearer", () => {
    process.env.CRON_SECRET = "correct-horse-staple-battery";
    _resetEnvCacheForTests();
    const req = new Request("https://example.com/api/cron/x", {
      headers: { authorization: "Bearer correct-horse-staple-battery" },
    });
    expect(verifyCronRequest(req).ok).toBe(true);
  });

  it("rejects missing header even with secret set", () => {
    process.env.CRON_SECRET = "correct-horse-staple-battery";
    _resetEnvCacheForTests();
    const req = new Request("https://example.com/api/cron/x");
    expect(verifyCronRequest(req).ok).toBe(false);
  });

  it("rejects x-vercel-cron header alone (cannot substitute for bearer)", () => {
    // The `x-vercel-cron` header is set by Vercel's platform internally but
    // is also trivially settable by any external caller. It must NEVER be
    // sufficient on its own — the bearer token is the only authoritative
    // proof that a request came from a trusted source.
    process.env.CRON_SECRET = "correct-horse-staple-battery";
    _resetEnvCacheForTests();
    const req = new Request("https://example.com/api/cron/x", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(verifyCronRequest(req).ok).toBe(false);
  });

  it("rejects x-vercel-cron header combined with a wrong bearer", () => {
    process.env.CRON_SECRET = "correct-horse-staple-battery";
    _resetEnvCacheForTests();
    const req = new Request("https://example.com/api/cron/x", {
      headers: {
        "x-vercel-cron": "1",
        authorization: "Bearer wrong-but-same-length-aaaaaa",
      },
    });
    expect(verifyCronRequest(req).ok).toBe(false);
  });
});
