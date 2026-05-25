import { describe, expect, it, vi } from "vitest";
import { defaultTimeoutForKind, isRetryableHttpStatus, withRetryAndTimeout } from "./brain-retry";

describe("brain-retry", () => {
  describe("isRetryableHttpStatus", () => {
    it.each([408, 425, 429, 500, 502, 503, 504])("treats HTTP %i as retryable", (status) => {
      expect(isRetryableHttpStatus(status)).toBe(true);
    });
    it.each([200, 400, 401, 403, 404])("treats HTTP %i as NOT retryable", (status) => {
      expect(isRetryableHttpStatus(status)).toBe(false);
    });
  });

  describe("defaultTimeoutForKind", () => {
    it("returns 90s for vision kinds", () => {
      expect(defaultTimeoutForKind("critique-concept-board")).toBe(90_000);
      expect(defaultTimeoutForKind("critique-production-sprites")).toBe(90_000);
    });
    it("returns 45s for non-vision kinds", () => {
      expect(defaultTimeoutForKind("compose-brief")).toBe(45_000);
    });
    it("honours ARTLAB_BRAIN_TIMEOUT_MS override", () => {
      process.env.ARTLAB_BRAIN_TIMEOUT_MS = "10000";
      try {
        expect(defaultTimeoutForKind("compose-brief")).toBe(10_000);
        expect(defaultTimeoutForKind("critique-concept-board")).toBe(10_000);
      } finally {
        delete process.env.ARTLAB_BRAIN_TIMEOUT_MS;
      }
    });
  });

  describe("withRetryAndTimeout", () => {
    it("returns retryCount=0 on first-attempt success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const env = await withRetryAndTimeout(fn, { opName: "test" });
      expect(env.result).toBe("ok");
      expect(env.retryCount).toBe(0);
      expect(env.lastError).toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable HTTP-status errors", async () => {
      const err503 = Object.assign(new Error("boom"), { status: 503 });
      const fn = vi.fn().mockRejectedValueOnce(err503).mockResolvedValueOnce("ok");
      const env = await withRetryAndTimeout(fn, { opName: "test", baseBackoffMs: 1 });
      expect(env.result).toBe("ok");
      expect(env.retryCount).toBe(1);
      expect(env.lastError).toMatch(/boom/);
    });

    it("does NOT retry on non-retryable errors", async () => {
      const err400 = Object.assign(new Error("bad request"), { status: 400 });
      const fn = vi.fn().mockRejectedValue(err400);
      await expect(withRetryAndTimeout(fn, { opName: "test", baseBackoffMs: 1 }))
        .rejects.toThrow(/bad request/);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("throws after max attempts with retryable errors", async () => {
      const err503 = Object.assign(new Error("boom"), { status: 503 });
      const fn = vi.fn().mockRejectedValue(err503);
      await expect(withRetryAndTimeout(fn, { opName: "test", maxAttempts: 2, baseBackoffMs: 1 }))
        .rejects.toThrow(/failed after 2 attempts/);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("aborts on timeout and retries", async () => {
      let calls = 0;
      const fn = async (signal: AbortSignal): Promise<string> => {
        calls += 1;
        if (calls === 1) {
          // First call: hang forever (until abort).
          return new Promise((_, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")));
          });
        }
        return "ok";
      };
      const env = await withRetryAndTimeout(fn, { opName: "test", timeoutMs: 50, baseBackoffMs: 1 });
      expect(env.result).toBe("ok");
      expect(env.retryCount).toBe(1);
    });
  });
});
