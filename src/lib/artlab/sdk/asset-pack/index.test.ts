import { describe, expect, it } from "vitest";
import * as assetPack from "./index";

describe("asset-pack public surface", () => {
  it("exports the manifest schema", () => {
    expect(typeof assetPack.ArtLabAssetPackManifestSchema).toBe("object");
  });
  it("exports createArtLabAssetPack", () => {
    expect(typeof assetPack.createArtLabAssetPack).toBe("function");
  });
  it("exports readArtLabAssetPack", () => {
    expect(typeof assetPack.readArtLabAssetPack).toBe("function");
  });
  it("exports the slot registry helpers", () => {
    expect(typeof assetPack.isArtLabSlotRegistered).toBe("function");
    expect(typeof assetPack.registerArtLabSlot).toBe("function");
    expect(typeof assetPack.resolveArtLabSlot).toBe("function");
  });
  it("exports renderArtLabIntegrationSnippet", () => {
    expect(typeof assetPack.renderArtLabIntegrationSnippet).toBe("function");
  });
  it("exports validateArtLabManifestAgainstSlots", () => {
    expect(typeof assetPack.validateArtLabManifestAgainstSlots).toBe("function");
  });
  it("exports liftLegacyArtLabAssetToSdkPack", () => {
    expect(typeof assetPack.liftLegacyArtLabAssetToSdkPack).toBe("function");
  });
  it("exports hashing helpers", () => {
    expect(typeof assetPack.sha256OfBytes).toBe("function");
    expect(typeof assetPack.sha256OfFile).toBe("function");
  });
  it("exports the constants", () => {
    expect(assetPack.ARTLAB_ASSET_PACK_VERSION).toBe("1.0.0");
    expect(Array.isArray(assetPack.ARTLAB_ASSET_KINDS)).toBe(true);
    expect(Array.isArray(assetPack.ARTLAB_AGENT_KINDS)).toBe(true);
  });
});
