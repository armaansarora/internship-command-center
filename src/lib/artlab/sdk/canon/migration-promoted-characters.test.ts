// src/lib/artlab/sdk/canon/migration-promoted-characters.test.ts
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadArtLabCanon } from "./load-canon";

const CANON_ROOT = join(process.cwd(), "docs/foundry/canon");

describe("promoted character migration", () => {
  it("otis is recorded with promoted status", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const otis = canon.characters.find((c) => c.header.id === "otis");
    expect(otis).toBeDefined();
    expect(otis?.promotionStatus).toBe("promoted");
    expect(otis?.title.toLowerCase()).toContain("concierge");
    expect(otis?.floorId).toBe("lobby");
  });

  it("mara-voss is recorded with promoted status", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const mara = canon.characters.find((c) => c.header.id === "mara-voss");
    expect(mara).toBeDefined();
    expect(mara?.promotionStatus).toBe("promoted");
    expect(mara?.title.toLowerCase()).toContain("ceo");
    expect(mara?.floorId).toBe("penthouse");
  });

  it("both promoted characters declare all 21 sprite slots (3 outfits × 7 poses)", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    for (const id of ["otis", "mara-voss"]) {
      const c = canon.characters.find((x) => x.header.id === id);
      expect(c?.outfitVariants.length).toBe(3);
      expect(c?.poseStates.length).toBe(7);
    }
  });
});
