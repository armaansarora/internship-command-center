import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getClientIp } from "./rate-limit-middleware";

describe("getClientIp", () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
  });
  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });

  it("prefers the first entry of x-forwarded-for", () => {
    const req = new Request("https://example.com/api/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.com/api/x", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns a sentinel when no headers are present", () => {
    const req = new Request("https://example.com/api/x");
    expect(getClientIp(req)).toBe("anon:unknown");
  });
});
