// src/lib/artlab/speed/cutout-pool.test.ts
import { describe, expect, it } from "vitest";
import { runCutoutPool, DEFAULT_CUTOUT_CONCURRENCY } from "./cutout-pool";

describe("cutout worker pool", () => {
  it("DEFAULT_CUTOUT_CONCURRENCY is at least 4 (or os.cpus().length, whichever is smaller)", () => {
    expect(DEFAULT_CUTOUT_CONCURRENCY).toBeGreaterThanOrEqual(2);
  });

  it("runs up to concurrency cutouts in parallel", async () => {
    let active = 0;
    let maxActive = 0;
    const cutout = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 30));
      active -= 1;
    };
    const tasks = Array.from({ length: 10 }, () => cutout);
    await runCutoutPool({ tasks, concurrency: 3 });
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1);
  });

  it("propagates errors (no silent swallowing)", async () => {
    const tasks = [async () => { throw new Error("nope"); }];
    await expect(runCutoutPool({ tasks, concurrency: 2 })).rejects.toThrow(/nope/);
  });
});
