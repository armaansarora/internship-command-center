import { describe, expect, it } from "vitest";
import {
  CREATIVE_ASSET_TYPES,
  CREATIVE_PHASES,
  getCreativeAssetTypeDefinition,
} from "./index";

describe("creative production registry", () => {
  it("supports every Tower creative asset type with housekeeping and improvement gates", () => {
    expect(CREATIVE_ASSET_TYPES).toEqual([
      "character",
      "environment",
      "prop",
      "ui-texture",
      "animation",
      "scene",
      "icon-system",
      "marketing-hero",
      "shader",
    ]);

    for (const assetType of CREATIVE_ASSET_TYPES) {
      const definition = getCreativeAssetTypeDefinition(assetType);

      expect(definition.displayName).toBeTruthy();
      expect(definition.outputRoot).toMatch(/^\.artlab\/studio\//);
      expect(definition.productionRoot).toMatch(/^public\//);
      expect(definition.phases.map((phase) => phase.id)).toContain("orient");
      expect(definition.phases.map((phase) => phase.id)).toContain("brainstorm");
      expect(definition.phases.map((phase) => phase.id)).toContain("concept-options");
      expect(definition.phases.map((phase) => phase.id)).toContain("final-review");
      expect(definition.requiredEveryPhaseGates).toEqual([
        "housekeeping",
        "continuous-improvement",
      ]);
    }
  });

  it("keeps the canonical phase order strict and shared", () => {
    expect(CREATIVE_PHASES).toEqual([
      "orient",
      "brainstorm",
      "plan",
      "concept-options",
      "approval",
      "production-packet",
      "generation",
      "ingest",
      "qa",
      "final-review",
      "promotion",
      "app-integration",
      "housekeeping",
      "continuous-improvement",
      "next-recommendation",
    ]);
  });
});
