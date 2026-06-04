import { describe, it, expect, afterEach, vi } from "vitest";
import { checkInMemoryRateLimit } from "./rate-limit";

/**
 * Unit tests for the in-memory token-bucket fallback limiter.
 *
 * This limiter guards hot, Upstash-free routes (e.g. /api/weather, hit on
 * every floor change) and was previously untested. The cases below lock in
 * the four behaviours call sites depend on: first-hit allowance, in-window
 * decrement, block-on-exceed, window reset, key isolation, and the H-7
 * map-size bound that stops adversarial keys from growing the map forever.
 *
 * Each test uses a unique key prefix because `memoryBuckets` is a module
 * global that persists across tests in this file.
 */
describe("checkInMemoryRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request and decrements remaining on each hit", () => {
    const r1 = checkInMemoryRateLimit("rl-decr", 3, 1000);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkInMemoryRateLimit("rl-decr", 3, 1000);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkInMemoryRateLimit("rl-decr", 3, 1000);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks once the limit is exceeded within the window", () => {
    const ok = checkInMemoryRateLimit("rl-block", 1, 10_000);
    expect(ok.success).toBe(true);
    const blocked = checkInMemoryRateLimit("rl-block", 1, 10_000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBe(ok.reset); // reset reflects the original window
  });

  it("resets the bucket after the window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(checkInMemoryRateLimit("rl-reset", 1, 1000).success).toBe(true);
    expect(checkInMemoryRateLimit("rl-reset", 1, 1000).success).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:02Z")); // +2s, window was 1s
    const afterWindow = checkInMemoryRateLimit("rl-reset", 1, 1000);
    expect(afterWindow.success).toBe(true);
    expect(afterWindow.remaining).toBe(0);
  });

  it("tracks each key independently", () => {
    const a = checkInMemoryRateLimit("rl-key-a", 1, 10_000);
    const b = checkInMemoryRateLimit("rl-key-b", 1, 10_000);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true); // b is not blocked by a's exhausted bucket
  });

  it("bounds the bucket map so adversarial distinct keys can't grow it forever (H-7)", () => {
    // First hit of the oldest key in this batch (limit 2 → remaining 1, never blocks).
    const first = checkInMemoryRateLimit("rl-evict-0", 2, 60_000);
    expect(first.remaining).toBe(1);

    // Push well past MEMORY_BUCKET_MAX_KEYS (10_000) with unique keys so the
    // oldest entry (rl-evict-0, plus any keys from earlier tests) is evicted.
    for (let i = 1; i <= 10_100; i += 1) {
      checkInMemoryRateLimit(`rl-evict-${i}`, 2, 60_000);
    }

    // If rl-evict-0 had been retained, this would be its 2nd hit (remaining 0).
    // Eviction means it's treated as a fresh bucket again (remaining 1).
    const again = checkInMemoryRateLimit("rl-evict-0", 2, 60_000);
    expect(again.remaining).toBe(1);
  });
});
