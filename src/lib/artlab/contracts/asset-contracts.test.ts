import { describe, expect, it } from "vitest";
import {
  getCreativeAssetContract,
  getCreativeAssetContractForCreativeType,
  listCreativeAssetContracts,
  type CreativeAssetContractType,
} from "./index";
import type { CreativeAssetType } from "../types";

const EXPECTED_CONTRACT_TYPES: CreativeAssetContractType[] = [
  "character",
  "background-environment",
  "ui-asset-button",
  "prop",
  "animation",
  "shader",
  "scene",
  "icon",
  "marketing-visual",
];

describe("creative production asset contracts", () => {
  it("defines every v1 final asset contract with outputs, QA, preview, promotion, manifest, and shortcuts", () => {
    const contracts = listCreativeAssetContracts();

    expect(contracts.map((contract) => contract.assetType)).toEqual(EXPECTED_CONTRACT_TYPES);

    for (const contract of contracts) {
      expect(contract.outputs.length).toBeGreaterThan(0);
      expect(contract.qaChecks.length).toBeGreaterThan(0);
      expect(contract.previewMode).toBeTruthy();
      expect(contract.promotionTarget.requiresExactApprovalPhrase).toBe("approved for app");
      expect(contract.manifestShape.schemaId).toMatch(/^tower\.creative-production\./);
      expect(contract.manifestShape.requiredFields).toContain("runId");
      expect(contract.forbiddenShortcuts).toContain("external-image-url");
      expect(contract.forbiddenShortcuts).toContain("data-uri");
      expect(contract.forbiddenShortcuts).toContain("public-art-before-approved-for-app");
    }
  });

  it("makes character the vertical slice and requires cutout plus alpha QA for app sprites", () => {
    const character = getCreativeAssetContract("character");

    expect(character.verticalSlice).toBe(true);
    expect(character.promotionTarget.targetPath).toBe("public/art/lobby/<characterId>");
    expect(character.promotionTarget.manifestPath).toBe("src/lib/visual-assets/approved-character-assets.generated.json");
    expect(character.outputs.map((output) => output.id)).toContain("transparent-production-png");
    expect(character.outputs.map((output) => output.id)).toContain("app-pose-manifest");
    expect(character.qaChecks).toContainEqual(expect.objectContaining({
      id: "local-cutout-required",
      severity: "blocker",
    }));
    expect(character.qaChecks).toContainEqual(expect.objectContaining({
      id: "alpha-channel-present",
      severity: "blocker",
    }));
    expect(character.forbiddenShortcuts).toContain("provider-alpha-without-local-cutout-qa");
  });

  it("does not force background or marketing visuals through the character cutout pipeline", () => {
    const background = getCreativeAssetContract("background-environment");
    const marketing = getCreativeAssetContract("marketing-visual");

    expect(background.qaChecks.map((check) => check.id)).not.toContain("local-cutout-required");
    expect(background.outputs.map((output) => output.id)).toContain("responsive-crop-set");
    expect(marketing.promotionTarget.kind).toBe("review-only");
    expect(marketing.qaChecks.map((check) => check.id)).toContain("text-safe-area");
  });

  it("maps every routed creative asset type to its canonical contract", () => {
    const routedTypes: CreativeAssetType[] = [
      "character",
      "environment",
      "prop",
      "ui-texture",
      "animation",
      "scene",
      "icon-system",
      "marketing-hero",
      "shader",
    ];

    const mappedContracts = routedTypes.map((assetType) =>
      getCreativeAssetContractForCreativeType(assetType).assetType);

    expect(mappedContracts).toEqual([
      "character",
      "background-environment",
      "prop",
      "ui-asset-button",
      "animation",
      "scene",
      "icon",
      "marketing-visual",
      "shader",
    ]);
  });
});
