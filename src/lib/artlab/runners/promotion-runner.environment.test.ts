// src/lib/artlab/runners/promotion-runner.environment.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
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

describe("promotion runner — environment asset type", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promo-env-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pub-"));
    seedFirewallPassingRun(runDir, "war-room-2026", "day-morning.png");
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
  });

  it("environment promotes to public/art/backgrounds/<runId>/", async () => {
    const result = await promotionRunner.run({
      runId: "war-room-2026",
      runDir,
      assetType: "environment",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    expect(existsSync(join(publicArtRoot, "backgrounds", "war-room-2026"))).toBe(true);
    expect(readdirSync(join(publicArtRoot, "backgrounds", "war-room-2026")).length).toBeGreaterThan(0);
  });
});
