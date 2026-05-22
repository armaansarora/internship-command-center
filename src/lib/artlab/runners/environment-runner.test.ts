// src/lib/artlab/runners/environment-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { environmentRunner } from "./environment-runner";

describe("environment runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-env-")); });

  it("produces exactly 4 slot files (one per time-of-day variant)", async () => {
    const result = await environmentRunner.run({
      runId: "r1",
      runDir,
      assetType: "environment",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(readdirSync(join(runDir, "production-slots"))).toHaveLength(4);
  });

  it("each slot file names its time-of-day variant", async () => {
    await environmentRunner.run({
      runId: "r1", runDir, assetType: "environment", providerId: "local-mock",
    });
    const files = readdirSync(join(runDir, "production-slots")).sort();
    expect(files).toEqual(["day-evening.json", "day-midday.json", "day-morning.json", "night.json"]);
  });
});
