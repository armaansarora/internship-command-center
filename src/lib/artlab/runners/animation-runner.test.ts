// src/lib/artlab/runners/animation-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { animationRunner } from "./animation-runner";

describe("animation runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-anim-")); });

  it("produces a frame folder + a sprite-sheet + a reduced-motion poster", async () => {
    const result = await animationRunner.run({
      runId: "lobby-ambient", runDir,
      assetType: "animation", providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "production-slots", "frames"))).toBe(true);
    expect(readdirSync(join(runDir, "production-slots", "frames")).length).toBeGreaterThanOrEqual(12);
    expect(existsSync(join(runDir, "production-slots", "sprite-sheet.json"))).toBe(true);
    expect(existsSync(join(runDir, "production-slots", "reduced-motion-poster.json"))).toBe(true);
  });
});
