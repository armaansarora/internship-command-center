import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strictQaRunner } from "./strict-qa-runner";

describe("strict QA runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-qa-"));
    const cutoutDir = join(runDir, "cutouts");
    mkdirSync(cutoutDir);
    writeFileSync(join(cutoutDir, "slot-1.png"), JSON.stringify({ alpha: true }));
  });

  it("writes asset-doctor.json and repair-plan.json", async () => {
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "asset-doctor.json"))).toBe(true);
    expect(existsSync(join(runDir, "repair-plan.json"))).toBe(true);
  });

  it("emits repair-required blocker when repair plan non-empty", async () => {
    writeFileSync(join(runDir, "cutouts", "slot-2.png"), JSON.stringify({ alpha: false }));
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.blockerHint).toBe("repair-required");
  });
});
