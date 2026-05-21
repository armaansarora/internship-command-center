// src/lib/artlab/runners/cutout-runner.pool.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cutoutRunner } from "./cutout-runner";

describe("cutout runner — uses worker pool (Phase 5)", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-cr-pool-"));
    const productionDir = join(runDir, "production-slots");
    mkdirSync(productionDir);
    for (let i = 1; i <= 8; i += 1) {
      writeFileSync(join(productionDir, `slot-${i}.json`), JSON.stringify({ slotId: `slot-${i}` }));
    }
  });

  it("wall-clock for 8 cutouts is < 4x the per-cutout latency (parallelism proof)", async () => {
    process.env.ARTLAB_CUTOUT_DELAY_MS = "60";
    const startedAt = Date.now();
    const result = await cutoutRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    const wallClock = Date.now() - startedAt;
    delete process.env.ARTLAB_CUTOUT_DELAY_MS;
    expect(result.status).toBe("ok");
    // 8 cutouts × 60ms sequential = 480ms; pool of ≥2 should beat 4x = 240ms by some margin
    expect(wallClock).toBeLessThan(240);
    expect((result.artifacts.cutoutPaths as string[])).toHaveLength(8);
  });
});
