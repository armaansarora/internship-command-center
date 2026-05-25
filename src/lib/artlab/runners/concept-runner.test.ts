import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conceptRunner } from "./concept-runner";

describe("concept runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-concept-")); });

  it("produces 5 concept slot outputs and a concept board artifact", async () => {
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(result.runnerKind).toBe("concept");
    expect((result.artifacts.slotOutputs as Array<{ jsonPath: string; pngPath: string }>).length).toBe(5);
    expect(existsSync(join(runDir, "concept-board.json"))).toBe(true);
    for (let i = 1; i <= 5; i += 1) {
      expect(existsSync(join(runDir, "concept-slots", `lane-${i}.png`))).toBe(true);
    }
  });

  it("returns failed when slot count target unreachable", async () => {
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
      abortSignal: AbortSignal.abort(),
    });
    expect(result.status).toBe("failed");
  });
});
