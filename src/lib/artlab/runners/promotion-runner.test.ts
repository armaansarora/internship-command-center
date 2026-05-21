import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

describe("promotion runner", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promote-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-art-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "slot-1.png"), JSON.stringify({ alpha: true }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
  });

  it("refuses to write without the exact approval phrase", async () => {
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approve for app" }));
    const result = await promotionRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("approval-phrase-mismatch");
  });

  it("copies cutouts to public/art/lobby/<characterId> when phrase is exact", async () => {
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
    const result = await promotionRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    expect(existsSync(join(publicArtRoot, "lobby", "cro"))).toBe(true);
    expect(readdirSync(join(publicArtRoot, "lobby", "cro")).length).toBeGreaterThan(0);
  });
});
