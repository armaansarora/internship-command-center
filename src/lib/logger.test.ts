import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { log } from "./logger";

describe("logger", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
    vi.restoreAllMocks();
  });

  it("redacts secret-looking fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info("test", {
      stripe_secret: "sk-abcd1234",
      password: "hunter2",
      authorization: "Bearer abc",
      normal: "ok",
    });
    const [, , fields] = spy.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(fields.stripe_secret).toBe("[redacted]");
    expect(fields.password).toBe("[redacted]");
    expect(fields.authorization).toBe("[redacted]");
    expect(fields.normal).toBe("ok");
  });

  it("redacts string tokens by prefix", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info("test", {
      rawKey: "sk-live-abcdef",
      safe: "hello",
    });
    const [, , fields] = spy.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(fields.rawKey).toBe("[redacted]");
    expect(fields.safe).toBe("hello");
  });
});
