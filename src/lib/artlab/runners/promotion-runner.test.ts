import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

function seedPassingRun(runDir: string, runId: string): void {
  mkdirSync(join(runDir, "cutouts"), { recursive: true });
  writeFileSync(join(runDir, "cutouts", "slot-1.png"), JSON.stringify({ alpha: true }));
  writeFileSync(join(runDir, "cutouts", "slot-2.png"), JSON.stringify({ alpha: true }));
  writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
  writeFileSync(join(runDir, "repair-plan.json"), JSON.stringify({ repairs: [] }));
  mkdirSync(join(runDir, "boards"), { recursive: true });
  writeFileSync(join(runDir, "boards", "final-board.json"), JSON.stringify({
    schemaVersion: "tower.creative-review-actions.v1",
    runId,
    boardType: "final-upload-ready",
    actions: [],
    localImagePaths: ["cutouts/slot-1.png"],
    promotesOnAction: false,
  }));
  writeFileSync(join(runDir, "boards", "app-preview.json"), JSON.stringify({
    schemaVersion: "tower.creative-review-actions.v1",
    runId,
    boardType: "app-preview",
    actions: [],
    localImagePaths: ["cutouts/slot-1.png"],
    promotesOnAction: false,
  }));
}

describe("promotion runner — delegates to the real firewall", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promote-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-art-"));
  });

  it("refuses to write when the approval phrase is wrong (firewall blocker: approval-phrase-missing)", async () => {
    seedPassingRun(runDir, "r1");
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approve for app" })); // typo
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(String(result.failureCode)).toContain("firewall:");
    expect(String(result.failureCode)).toContain("approval-phrase-missing");
  });

  it("refuses to write when strict-qa did not pass (firewall blocker: strict-qa-missing)", async () => {
    seedPassingRun(runDir, "r1");
    writeFileSync(join(runDir, "repair-plan.json"), JSON.stringify({ repairs: [{ cutoutPath: "x", reason: "y", remediation: "z" }] }));
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(String(result.failureCode)).toContain("strict-qa-missing");
  });

  it("refuses to write when the final-board manifest is missing (firewall blocker: final-board-manifest-missing)", async () => {
    seedPassingRun(runDir, "r1");
    // Wipe the boards dir to simulate missing manifests
    writeFileSync(join(runDir, "boards", "final-board.json"), ""); // empty → JSON.parse will throw → exists:false
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(String(result.failureCode)).toContain("final-board-manifest-missing");
  });

  it("promotes successfully when phrase + strict-qa + both manifests are present and emits a receipt", async () => {
    seedPassingRun(runDir, "r1");
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    const target = join(publicArtRoot, "lobby", "cro");
    expect(existsSync(target)).toBe(true);
    expect(readdirSync(target).length).toBeGreaterThan(0);
    const receiptPath = join(runDir, "promotion-receipt.json");
    expect(existsSync(receiptPath)).toBe(true);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    expect(receipt.approvalPhrase).toBe("approved for app");
    expect(receipt.runId).toBe("r1");
  });
});
