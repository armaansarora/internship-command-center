// src/lib/artlab/sdk/agents/ui-texture/types.test.ts
import { describe, expect, it } from "vitest";
import {
  ARTLAB_UI_TEXTURE_KINDS,
  ArtLabUiTextureInputSchema,
  ArtLabUiIconManifestSchema,
  ArtLabUiTextureManifestSchema,
} from "./types";

describe("artlab sdk ui-texture types", () => {
  it("declares the two artifact kinds", () => {
    expect(ARTLAB_UI_TEXTURE_KINDS).toEqual(["icon", "texture"]);
  });

  it("accepts an icon input", () => {
    const parsed = ArtLabUiTextureInputSchema.parse({
      runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
      name: "elevator-door",
      kind: "icon",
      requestedBy: "agent",
      ariaLabel: "Elevator door icon",
    });
    expect(parsed.kind).toBe("icon");
  });

  it("accepts a texture input", () => {
    const parsed = ArtLabUiTextureInputSchema.parse({
      runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
      name: "etched-gold-border",
      kind: "texture",
      requestedBy: "agent",
      tileMode: "repeat",
    });
    expect(parsed.kind).toBe("texture");
  });

  it("rejects an icon input missing ariaLabel", () => {
    expect(() =>
      ArtLabUiTextureInputSchema.parse({
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        name: "elevator-door",
        kind: "icon",
        requestedBy: "agent",
      }),
    ).toThrow();
  });

  it("icon manifest carries strokeWidthPx", () => {
    const parsed = ArtLabUiIconManifestSchema.parse({
      name: "elevator-door",
      svgPath: "elevator-door.svg",
      ariaLabel: "Elevator door icon",
      strokeWidthPx: 1.5,
      viewBox: "0 0 24 24",
    });
    expect(parsed.strokeWidthPx).toBe(1.5);
  });

  it("texture manifest carries normalMapPath and tile mode", () => {
    const parsed = ArtLabUiTextureManifestSchema.parse({
      name: "etched-gold-border",
      pngPath: "etched-gold-border.png",
      normalMapPath: "etched-gold-border.normal.png",
      tileMode: "repeat",
      targetResolutionPx: 1024,
    });
    expect(parsed.tileMode).toBe("repeat");
  });
});
