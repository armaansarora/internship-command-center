// src/lib/artlab/sdk/canon/migration-queued-cast.test.ts
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadArtLabCanon } from "./load-canon";

const CANON_ROOT = join(process.cwd(), "docs/artlab/sdk/canon");

const QUEUED_IDS = [
  "rafe-calder",
  "priya",
  "dylan",
  "vera",
  "sol-navarro",
  "inez",
  "mina",
  "etta",
  "rowan",
  "nadia",
] as const;

describe("queued cast migration", () => {
  it("every queued cast member is recorded", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const present = new Set(canon.characters.map((c) => c.header.id));
    for (const id of QUEUED_IDS) {
      expect(present.has(id), `missing canon for ${id}`).toBe(true);
    }
  });

  it("every queued cast member declares promotionStatus queued or in-flight", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    for (const id of QUEUED_IDS) {
      const c = canon.characters.find((x) => x.header.id === id);
      expect(["queued", "in-flight"]).toContain(c?.promotionStatus);
    }
  });

  it("every queued cast member references tower-default palette", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    for (const id of QUEUED_IDS) {
      const c = canon.characters.find((x) => x.header.id === id);
      expect(c?.paletteRef).toBe("tower-default");
    }
  });

  it("total character count is 12 (2 promoted + 10 queued)", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    expect(canon.characters.length).toBe(12);
  });
});
