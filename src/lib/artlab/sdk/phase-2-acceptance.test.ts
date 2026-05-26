import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

describe("Phase 2 acceptance", () => {
  it("npm run foundry -- canon validate exits 0 (Phase 0 inheritance)", () => {
    const out = execSync("npm run foundry --silent -- canon validate", { encoding: "utf8" });
    expect(out.trim().endsWith("canon ok")).toBe(true);
  });

  it("agents public surface re-exports runCharacterMaster", async () => {
    const m = await import("./agents/index");
    expect(typeof m.runCharacterMaster).toBe("function");
  });

  it("asset-pack public surface re-exports createFoundryAssetPack", async () => {
    const m = await import("./asset-pack/index");
    expect(typeof m.createFoundryAssetPack).toBe("function");
  });

  it("canon public surface re-exports loadFoundryCanon", async () => {
    const m = await import("./canon/index");
    expect(typeof m.loadFoundryCanon).toBe("function");
  });
});
