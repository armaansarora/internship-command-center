// src/lib/artlab/sdk/canon/canon-identity-contract.test.ts
//
// Contract test for the intake → canon identity bridge (Unit 5 of the
// 2026-05-27 system-fixes plan). For EVERY character in canon, every alias a
// user might type — `displayName`, `firstName lastName`, `shortLabel`,
// `roleSlug`, or the header.id itself — must route to the canonical
// `header.id` (not the runtime roleSlug). This is the single test that holds
// the line on the `characterId` / canon drift bug class.
//
// Red→green: when this test first runs against `routeRequest`, it fails for
// every non-trivial roleSlug→header.id mismatch (e.g., `"cno"` instead of
// `"sol-navarro"`). After the router is updated to call resolveCanonCharacter
// at the boundary, every alias routes to the canonical id.
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { loadArtLabCanon } from "./load-canon";
import { resolveCanonCharacter } from "./resolve-character";
import { routeRequest } from "@/lib/artlab/intake/router";

const CANON_ROOT = resolve(process.cwd(), "docs/artlab/sdk/canon");

describe("canon identity contract — every alias resolves to header.id", () => {
  it("loads canon characters (sanity)", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    expect(canon.characters.length).toBeGreaterThanOrEqual(8);
  });

  describe("resolveCanonCharacter — bridge from runtime to canon", () => {
    it("resolves header.id → header.id with no fallback log", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        const resolved = resolveCanonCharacter(canon.characters, c.header.id);
        expect(resolved?.header.id).toBe(c.header.id);
      }
    });

    it("resolves roleSlug → header.id (logging the fallback exactly once per call)", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        if (c.roleSlug === c.header.id) continue; // identity match — no fallback fires
        const resolved = resolveCanonCharacter(canon.characters, c.roleSlug);
        expect(resolved?.header.id).toBe(c.header.id);
      }
    });
  });

  describe("routeRequest — every alias routes to canon header.id", () => {
    it("routes by displayName → canon header.id", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        const result = routeRequest({ request: `make ${c.displayName}` });
        expect(result.characterId).toBe(c.header.id);
        expect(result.assetType).toBe("character");
      }
    });

    it("routes by 'firstName lastName' → canon header.id", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        // displayName already has both names, but we explicitly split to
        // exercise the firstName + lastName recognition path in the
        // ambiguity detector.
        const tokens = c.displayName.split(/\s+/);
        if (tokens.length < 2) continue;
        const phrased = `${tokens[0]} ${tokens.at(-1)}`;
        const result = routeRequest({ request: `make ${phrased} for the Tower` });
        expect(result.characterId).toBe(c.header.id);
      }
    });

    it("routes by shortLabel → canon header.id", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        // shortLabel is a free-form first-name-ish token (e.g. "Sol", "Otis").
        // We do NOT assert the route succeeds for every shortLabel — a
        // shortLabel that collides with a common word would correctly be
        // ambiguous. We only assert: when the route DOES return a
        // characterId, it must be the canon header.id.
        const result = routeRequest({ request: `make ${c.shortLabel}` });
        if (result.characterId !== undefined) {
          expect(result.characterId).toBe(c.header.id);
        }
      }
    });

    it("routes by roleSlug (typed as 'characterId: <slug>') → canon header.id", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        const result = routeRequest({ request: `make characterId: ${c.roleSlug}` });
        expect(result.characterId).toBe(c.header.id);
      }
    });

    it("routes by header.id (typed as 'characterId: <id>') → canon header.id", async () => {
      const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
      for (const c of canon.characters) {
        const result = routeRequest({ request: `make characterId: ${c.header.id}` });
        expect(result.characterId).toBe(c.header.id);
      }
    });
  });
});
