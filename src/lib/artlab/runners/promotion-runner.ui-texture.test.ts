// src/lib/artlab/runners/promotion-runner.ui-texture.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

describe("promotion runner — UI texture asset type", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promo-uit-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pub-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "button-default.png"), JSON.stringify({ alpha: false }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
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
