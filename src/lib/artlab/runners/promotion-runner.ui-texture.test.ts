// src/lib/artlab/runners/promotion-runner.ui-texture.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

function seedFirewallPassingRun(runDir: string, runId: string, cutoutName: string): void {
  mkdirSync(join(runDir, "cutouts"), { recursive: true });
  writeFileSync(join(runDir, "cutouts", cutoutName), JSON.stringify({ alpha: true }));
  writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
  writeFileSync(join(runDir, "repair-plan.json"), JSON.stringify({ repairs: [] }));
  mkdirSync(join(runDir, "boards"), { recursive: true });
  for (const board of ["final-board.json", "app-preview.json"]) {
    writeFileSync(join(runDir, "boards", board), JSON.stringify({
      schemaVersion: "tower.creative-review-actions.v1",
      runId,
      boardType: board === "final-board.json" ? "final-upload-ready" : "app-preview",
      actions: [],
      localImagePaths: [`cutouts/${cutoutName}`],
      promotesOnAction: false,
    }));
  }
}

describe("promotion runner — UI texture asset type", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promo-uit-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pub-"));
    seedFirewallPassingRun(runDir, "tower-buttons-2026", "button-default.png");
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
  });

  it("ui-texture promotes to public/art/ui/<runId>/", async () => {
    const result = await promotionRunner.run({
      runId: "tower-buttons-2026", runDir, assetType: "ui-texture", providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    expect(existsSync(join(publicArtRoot, "ui", "tower-buttons-2026"))).toBe(true);
  });
});
