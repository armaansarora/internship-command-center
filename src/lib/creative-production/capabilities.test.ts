import { describe, expect, it } from "vitest";
import {
  CREATIVE_ASSET_TYPES,
  CREATIVE_CAPABILITY_IDS,
  getCreativeCapabilitiesForAssetType,
  getCreativeCapabilityDefinition,
  getCreativeCapabilityInstructions,
  listCreativeCapabilityDefinitions,
} from "./index";

describe("creative production capabilities", () => {
  it("maps every asset type to production capabilities with QA and previews", () => {
    for (const assetType of CREATIVE_ASSET_TYPES) {
      const capabilities = getCreativeCapabilitiesForAssetType(assetType);

      expect(capabilities.length).toBeGreaterThanOrEqual(3);
      expect(capabilities.some((capability) => capability.id === "review-board")).toBe(true);

      for (const capability of capabilities) {
        expect(capability.requiredOutputs.length).toBeGreaterThan(0);
        expect(capability.qaGates.length).toBeGreaterThan(0);
        expect(capability.previewTargets.length).toBeGreaterThan(0);
      }
    }
  });

  it("supports code UI, shader, motion, and immersive scene work", () => {
    expect(CREATIVE_CAPABILITY_IDS).toContain("code-ui-component");
    expect(CREATIVE_CAPABILITY_IDS).toContain("shader-effect");
    expect(CREATIVE_CAPABILITY_IDS).toContain("motion-system");
    expect(CREATIVE_CAPABILITY_IDS).toContain("three-scene");

    expect(getCreativeCapabilityDefinition("shader-effect")).toMatchObject({
      deliveryMode: "shader",
    });
    expect(getCreativeCapabilityDefinition("three-scene")).toMatchObject({
      deliveryMode: "three",
    });
  });

  it("renders capability instructions for packets and prompts", () => {
    const instructions = getCreativeCapabilityInstructions("animation");

    expect(instructions.join("\n")).toContain("Shader Effect");
    expect(instructions.join("\n")).toContain("Three.js Scene");
    expect(instructions.join("\n")).toContain("prefers-reduced-motion");
  });

  it("keeps capability registry complete", () => {
    const definitions = listCreativeCapabilityDefinitions();

    expect(definitions).toHaveLength(CREATIVE_CAPABILITY_IDS.length);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(CREATIVE_CAPABILITY_IDS.length);
  });
});
