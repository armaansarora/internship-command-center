// src/lib/artlab/speed/provider-batch.test.ts
import { describe, expect, it, vi } from "vitest";
import { withRetryAndBackoff, DEFAULT_RETRY_OPTIONS } from "./provider-batch";

describe("provider retry+backoff helper", () => {
  it("succeeds on first try without sleep", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    const result = await withRetryAndBackoff(op, { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    let calls = 0;
    const op = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) throw new Error("HTTP 429");
      return "ok";
    });
    const result = await withRetryAndBackoff(op, { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 5, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on 4xx other than 429 (quality preserved)", async () => {
    const op = vi.fn().mockRejectedValue(new Error("HTTP 400 bad request"));
    await expect(withRetryAndBackoff(op, { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 5, baseDelayMs: 1 })).rejects.toThrow(/400/);
    expect(op).toHaveBeenCalledTimes(1);
  });
});
