// src/lib/artlab/coherence/cast-diversity-regression.test.ts
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computePerceptualHash } from "./hashes";

describe.skip("Phase 6 cast diversity (manual — run after each character)", () => {
  const publicArtRoot = "public/art/lobby";

  it("every promoted character's idle.webp has a distinct perceptual hash from all others", async () => {
    if (!existsSync(publicArtRoot)) return;
    const characters = readdirSync(publicArtRoot).filter((d) =>
      existsSync(join(publicArtRoot, d, "idle.webp")),
    );
    expect(characters.length).toBeGreaterThan(0);
    const hashes: { characterId: string; hash: string }[] = [];
    for (const characterId of characters) {
      const bytes = readFileSync(join(publicArtRoot, characterId, "idle.webp"));
      const hash = await computePerceptualHash(bytes);
      hashes.push({ characterId, hash });
    }
    // All hashes must be distinct — no character's idle pose collides with another's.
    const distinct = new Set(hashes.map((h) => h.hash));
    expect(distinct.size).toBe(hashes.length);
  }, 60_000);
});
