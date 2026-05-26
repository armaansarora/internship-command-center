// src/lib/foundry/agents/ui-texture/index.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runFoundryUiTexture } from "./index";
import { createFoundryIconMockLlmProvider } from "./__tests__/mock-llm-provider";

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
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => ({
    packId: "ui-pack-1",
    manifest,
  })),
}));

const mockImageProvider = {
  async generateImage(_input: { prompt: string; aspectRatio: string; seed?: number }) {
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 128, g: 128, b: 128 } },
    })
      .png()
      .toBuffer();
    return { mode: "mock" as const, bytes, contentType: "image/png" as const, costCents: 0, durationMs: 1 };
  },
};

describe("runFoundryUiTexture", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-ui-agent-"));
  });

  it("icon kind produces a pack with assetKind=ui-icon", async () => {
    const result = await runFoundryUiTexture(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        name: "elevator-door",
        kind: "icon",
        requestedBy: "agent",
        ariaLabel: "Elevator door icon",
      },
      { iconLlm: createFoundryIconMockLlmProvider(), image: mockImageProvider },
      { runDir: dir },
    );
    const manifest = result.manifest as { assetKind: string };
    expect(manifest.assetKind).toBe("ui-icon");
    expect(existsSync(join(dir, "pack", "elevator-door.svg"))).toBe(true);
  });

  it("texture kind produces a pack with assetKind=ui-texture", async () => {
    const result = await runFoundryUiTexture(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        name: "etched-gold",
        kind: "texture",
        requestedBy: "agent",
        tileMode: "repeat",
      },
      { iconLlm: createFoundryIconMockLlmProvider(), image: mockImageProvider },
      { runDir: dir },
    );
    const manifest = result.manifest as { assetKind: string };
    expect(manifest.assetKind).toBe("ui-texture");
    expect(existsSync(join(dir, "pack", "etched-gold.png"))).toBe(true);
    expect(existsSync(join(dir, "pack", "etched-gold.normal.png"))).toBe(true);
  });

  it("icon kind manifest carries strokeWidthPx", async () => {
    const result = await runFoundryUiTexture(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        name: "x",
        kind: "icon",
        requestedBy: "agent",
        ariaLabel: "X icon",
      },
      { iconLlm: createFoundryIconMockLlmProvider(), image: mockImageProvider },
      { runDir: dir },
    );
    const manifest = result.manifest as { icon: { strokeWidthPx: number } };
    expect(manifest.icon.strokeWidthPx).toBe(1.5);
  });

  it("texture kind manifest carries tileMode and normalMapPath", async () => {
    const result = await runFoundryUiTexture(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        name: "y",
        kind: "texture",
        requestedBy: "agent",
        tileMode: "repeat-x",
      },
      { iconLlm: createFoundryIconMockLlmProvider(), image: mockImageProvider },
      { runDir: dir },
    );
    const manifest = result.manifest as {
      texture: { tileMode: string; normalMapPath: string };
    };
    expect(manifest.texture.tileMode).toBe("repeat-x");
    expect(manifest.texture.normalMapPath).toBe("y.normal.png");
  });
});
