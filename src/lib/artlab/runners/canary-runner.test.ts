import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canaryRunner } from "./canary-runner";

describe("canary runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-canary-"));
    writeFileSync(join(runDir, "approved-concept.json"), JSON.stringify({ laneIndex: 2 }));
  });

  it("produces one canary slot + canary-gate.json", async () => {
    const result = await canaryRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      approvedLaneIndex: 2,
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "canary-gate.json"))).toBe(true);
  });

  it("returns failed without approved lane index", async () => {
    const result = await canaryRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("missing-approved-lane");
  });
});
