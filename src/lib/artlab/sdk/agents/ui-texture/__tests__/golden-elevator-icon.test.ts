// src/lib/foundry/agents/ui-texture/__tests__/golden-elevator-icon.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFoundryUiTextureCli } from "../cli";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadFoundryIconographyRules: vi.fn().mockResolvedValue({
    strokeWidthPx: 1.5,
    cornerRadiusPx: 2,
    palette: ["#C9A84C"],
    viewBox: "0 0 24 24",
  }),
  loadFoundryTextureRules: vi.fn().mockResolvedValue({
    tileToleranceDeltaE: 5,
    targetResolutionPx: 64,
    normalMapStrength: 0.7,
  }),
}));

vi.mock("@/lib/artlab/sdk/asset-pack", () => ({
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join: pathJoin } = await import("node:path");
    const dir = (manifest as { __packDir?: string }).__packDir ?? "/tmp";
    mkdirSync(dir, { recursive: true });
    writeFileSync(pathJoin(dir, "manifest.json"), JSON.stringify(manifest));
    return { packId: "golden", manifest };
  }),
}));

describe("golden elevator icon", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-ui-icon-golden-"));
  });

  it("produces an SVG with manifest reference", async () => {
    await runFoundryUiTextureCli({
      name: "elevator-door",
      kind: "icon",
      ariaLabel: "Elevator door icon",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
    });
    expect(existsSync(join(dir, "pack", "elevator-door.svg"))).toBe(true);
    const svg = readFileSync(join(dir, "pack", "elevator-door.svg"), "utf8");
    expect(svg).toContain('stroke-width="1.5"');
    expect(svg).toContain('aria-label="Elevator door icon"');
  });

  it("dry-run prints validated without writing artefacts", async () => {
    const out = await runFoundryUiTextureCli({
      name: "elevator-door",
      kind: "icon",
      ariaLabel: "Elevator door icon",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
      dryRun: true,
    });
    expect(out.summary).toContain("validated");
    expect(existsSync(join(dir, "pack"))).toBe(false);
  });
});
