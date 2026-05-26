import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCutoutAndFeatherStage } from "./stages/cutout-and-feather";
import type { CharacterVariantSprite } from "./stages/variant-fan-out";

const FIXTURES = join(__dirname, "__fixtures__", "sol-navarro");

describe("Sol Navarro golden fixtures", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-golden-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("post-cutout alpha histogram matches the golden envelope within tolerance", async () => {
    const bytes = readFileSync(join(FIXTURES, "pre-cutout-idle.png"));
    const sprite: CharacterVariantSprite = {
      characterId: "sol-navarro",
      outfit: "regular",
      pose: "idle",
      bytes,
      widthPx: 0,
      heightPx: 0,
      prompt: "p",
    };
    const result = await runCutoutAndFeatherStage({ sprites: [sprite], workDir: tmpDir });
    const expected = JSON.parse(readFileSync(join(FIXTURES, "expected-alpha-histogram.json"), "utf8"));
    const actual = result.processedSprites[0]!.alphaSamples;
    expect(actual.totalOpaquePx).toBeGreaterThan(expected.totalOpaquePxMin);
    expect(actual.totalTransparentPx).toBeGreaterThan(expected.totalTransparentPxMin);
  });

  it("expected manifest skeleton declares the right slot and canon refs", () => {
    const skeleton = JSON.parse(readFileSync(join(FIXTURES, "expected-manifest-skeleton.json"), "utf8"));
    expect(skeleton.kind).toBe("character-spritesheet");
    expect(skeleton.canonRefs.characterId).toBe("sol-navarro");
    expect(skeleton.canonRefs.paletteRef).toBe("tower-default");
    expect(skeleton.intendedSlot.slotId).toMatch(/sol-navarro\/regular\/idle$/);
  });
});
