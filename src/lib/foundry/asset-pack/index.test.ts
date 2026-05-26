import { describe, expect, it } from "vitest";
import * as assetPack from "./index";

describe("asset-pack public surface", () => {
  it("exports the manifest schema", () => {
    expect(typeof assetPack.FoundryAssetPackManifestSchema).toBe("object");
  });
  it("exports createFoundryAssetPack", () => {
    expect(typeof assetPack.createFoundryAssetPack).toBe("function");
  });
  it("exports readFoundryAssetPack", () => {
    expect(typeof assetPack.readFoundryAssetPack).toBe("function");
  });
  it("exports the slot registry helpers", () => {
    expect(typeof assetPack.isFoundrySlotRegistered).toBe("function");
    expect(typeof assetPack.registerFoundrySlot).toBe("function");
    expect(typeof assetPack.resolveFoundrySlot).toBe("function");
  });
  it("exports renderFoundryIntegrationSnippet", () => {
    expect(typeof assetPack.renderFoundryIntegrationSnippet).toBe("function");
  });
  it("exports validateFoundryManifestAgainstSlots", () => {
    expect(typeof assetPack.validateFoundryManifestAgainstSlots).toBe("function");
  });
  it("exports liftLegacyArtLabAssetToFoundryPack", () => {
    expect(typeof assetPack.liftLegacyArtLabAssetToFoundryPack).toBe("function");
  });
  it("exports hashing helpers", () => {
    expect(typeof assetPack.sha256OfBytes).toBe("function");
    expect(typeof assetPack.sha256OfFile).toBe("function");
  });
  it("exports the constants", () => {
    expect(assetPack.FOUNDRY_ASSET_PACK_VERSION).toBe("1.0.0");
    expect(Array.isArray(assetPack.FOUNDRY_ASSET_KINDS)).toBe(true);
    expect(Array.isArray(assetPack.FOUNDRY_AGENT_KINDS)).toBe(true);
  });
});
