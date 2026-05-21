// src/lib/artlab/runners/concept-runner.parallel.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conceptRunner } from "./concept-runner";

describe("concept runner — true 5-lane parallelism (Phase 5)", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-cr-par-")); });

  it("five-lane wall-clock is approximately max(lane time), not sum", async () => {
    process.env.ARTLAB_CONCEPT_LANE_DELAY_MS = "100"; // each mock lane "takes" 100ms
    const startedAt = Date.now();
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    const wallClock = Date.now() - startedAt;
    delete process.env.ARTLAB_CONCEPT_LANE_DELAY_MS;
    expect(result.status).toBe("ok");
    expect(wallClock).toBeLessThan(300); // 5x sequential would be 500ms; parallel is ~100ms + overhead
    expect(readdirSync(join(runDir, "concept-slots"))).toHaveLength(5);
  });

  it("each lane file still exists with the right slot json (quality preserved)", async () => {
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const slots = readdirSync(join(runDir, "concept-slots")).sort();
    expect(slots).toEqual(["lane-1.json", "lane-2.json", "lane-3.json", "lane-4.json", "lane-5.json"]);
  });
});
