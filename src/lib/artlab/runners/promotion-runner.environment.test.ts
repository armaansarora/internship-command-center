// src/lib/artlab/runners/promotion-runner.environment.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

describe("promotion runner — environment asset type", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promo-env-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pub-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "day-morning.png"), JSON.stringify({ alpha: false }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
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
