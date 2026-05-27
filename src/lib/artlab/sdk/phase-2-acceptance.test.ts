import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

describe("Phase 2 acceptance", () => {
  it("npm run artlab:sdk-canon-validate exits 0 (Phase 0 inheritance)", () => {
    const out = execSync("npm run artlab:sdk-canon-validate --silent", { encoding: "utf8" });
    expect(out.trim().endsWith("canon ok")).toBe(true);
  });

  it("agents public surface re-exports runCharacterMaster", async () => {
    const m = await import("./agents/index");
    expect(typeof m.runCharacterMaster).toBe("function");
  });

  it("asset-pack public surface re-exports createArtLabAssetPack", async () => {
    const m = await import("./asset-pack/index");
    expect(typeof m.createArtLabAssetPack).toBe("function");
  });

  it("canon public surface re-exports loadArtLabCanon", async () => {
    const m = await import("./canon/index");
    expect(typeof m.loadArtLabCanon).toBe("function");
  });
});
