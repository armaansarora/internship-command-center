import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { productionRunner, PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE } from "./production-runner";

describe("production runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-prod-")); });

  it("produces the configured slot count per asset type", async () => {
    expect(PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE.character).toBeGreaterThan(0);
    const result = await productionRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      approvedLaneIndex: 2,
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const outputs = result.artifacts.slotOutputs as string[];
    expect(outputs.length).toBe(PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE.character);
    expect(existsSync(outputs[0]!)).toBe(true);
  });
});
