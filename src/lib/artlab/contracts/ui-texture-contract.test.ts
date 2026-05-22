// src/lib/artlab/contracts/ui-texture-contract.test.ts
import { describe, expect, it } from "vitest";
import { UI_TEXTURE_CONTRACT, validateUiTextureSlotSpec } from "./ui-texture-contract";

describe("UI texture contract", () => {
  it("tileable, small dimensions, color-palette constrained", () => {
    expect(UI_TEXTURE_CONTRACT.tileable).toBe(true);
    expect(UI_TEXTURE_CONTRACT.maxWidth).toBeLessThanOrEqual(512);
    expect(UI_TEXTURE_CONTRACT.colorPalette).toContain("#1A1A2E");
    expect(UI_TEXTURE_CONTRACT.colorPalette).toContain("#C9A84C");
  });

  it("validates a slot spec", () => {
    expect(() => validateUiTextureSlotSpec({ slotId: "btn-primary", surface: "button", state: "hover" })).not.toThrow();
  });
});
