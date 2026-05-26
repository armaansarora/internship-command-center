import { describe, expect, it } from "vitest";
import { FOUNDRY_DEMO_PACKS } from "./demo-fixtures";

describe("FOUNDRY_DEMO_PACKS", () => {
  it("contains exactly one pack per demo modality (character / floor / icon / sprite-animation)", () => {
    const kinds = FOUNDRY_DEMO_PACKS.map((p) => p.kind).sort();
    expect(kinds).toEqual(["character", "floor", "icon", "sprite-animation"]);
  });

  it("every demo pack has a publicPath that starts with /art/", () => {
    for (const p of FOUNDRY_DEMO_PACKS) {
      expect(p.publicPath.startsWith("/art/")).toBe(true);
    }
  });

  it("every demo pack carries a Zod-valid manifest shape", () => {
    for (const p of FOUNDRY_DEMO_PACKS) {
      expect(typeof p.packId).toBe("string");
      expect(typeof p.slotId).toBe("string");
      expect(typeof p.promotedAt).toBe("string");
    }
  });

  it("each demo pack carries an `integration` block keyed by its kind", () => {
    for (const p of FOUNDRY_DEMO_PACKS) {
      expect(p.integration).toBeDefined();
    }
  });
});
