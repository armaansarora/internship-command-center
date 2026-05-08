import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { _resetEnvCacheForTests } from "./env";
import { log } from "./logger";

const { captureExceptionSpy, captureMessageSpy } = vi.hoisted(() => ({
  captureExceptionSpy: vi.fn(),
  captureMessageSpy: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionSpy,
  captureMessage: captureMessageSpy,
}));

describe("logger", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
    _resetEnvCacheForTests();
    captureExceptionSpy.mockReset();
    captureMessageSpy.mockReset();
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
    _resetEnvCacheForTests();
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

  it("captures production errors in Sentry with sanitized context", () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    _resetEnvCacheForTests();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("stripe down");
    log.error("stripe.checkout.create_session_failed", err, {
      userId: "user-123",
      token: "sk-live-secret",
      promptText: "user-written cover letter content",
    });

    expect(captureExceptionSpy).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        level: "error",
        tags: { event: "stripe.checkout.create_session_failed" },
        extra: {
          userId: "user-123",
          token: "[redacted]",
          promptText: "[omitted]",
        },
      }),
    );
  });

  it("captures only alert-marked warnings in Sentry", () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    _resetEnvCacheForTests();
    vi.spyOn(console, "log").mockImplementation(() => {});

    log.warn("weather.upstream_error", { status: 503 });
    expect(captureMessageSpy).not.toHaveBeenCalled();

    log.warn("auth.callback.exchange_failed", {
      alert: true,
      error: "bad code",
      email: "guest@example.com",
    });

    expect(captureMessageSpy).toHaveBeenCalledWith(
      "auth.callback.exchange_failed",
      expect.objectContaining({
        level: "warning",
        tags: { event: "auth.callback.exchange_failed" },
        extra: {
          error: "bad code",
          email: "[omitted]",
        },
      }),
    );
  });
});
