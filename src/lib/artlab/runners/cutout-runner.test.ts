import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cutoutRunner } from "./cutout-runner";

describe("cutout runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-cutout-"));
    const productionDir = join(runDir, "production-slots");
    mkdirSync(productionDir);
    for (let i = 1; i <= 3; i += 1) {
      writeFileSync(join(productionDir, `slot-${i}.json`), JSON.stringify({ slotId: `slot-${i}` }));
    }
  });

  it("produces one cutout artifact per production slot", async () => {
    const result = await cutoutRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const cutouts = result.artifacts.cutoutPaths as string[];
    expect(cutouts.length).toBe(3);
    for (const cp of cutouts) expect(existsSync(cp)).toBe(true);
  });

  it("skips cleanly when asset type is environment", async () => {
    const result = await cutoutRunner.run({
      runId: "r1",
      runDir,
      assetType: "environment",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(result.artifacts.skippedReason).toBe("asset-type-has-no-cutout");
  });
});
