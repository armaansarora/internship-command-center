// src/lib/artlab/sdk/canon/resolve-character.test.ts
import { describe, expect, it, vi } from "vitest";
import type { ArtLabCharacterCanon } from "./character-schema";
import { resolveCanonCharacter } from "./resolve-character";

function makeChar(overrides: {
  id: string;
  roleSlug: string;
}): ArtLabCharacterCanon {
  return {
    header: {
      kind: "character",
      schemaVersion: "1.0.0",
      id: overrides.id,
      revisedAt: "2026-05-25T00:00:00.000Z",
    },
    roleSlug: overrides.roleSlug,
    displayName: "Display",
    shortLabel: "Label",
    title: "Title",
    floorId: "floor",
    floorLabel: "Floor",
    styleEnvelope: "tower-flat-plus-depth-v1",
    visualArchetype: "archetype",
    silhouette: "silhouette",
    wardrobe: "wardrobe",
    props: ["prop"],
    mobileRead: "mobile",
    negativeDNA: "negative",
    accent: "accent",
    doctrine: "doctrine",
    flaw: "flaw",
    secretStrength: "strength",
    wound: "wound",
    outfitVariants: ["regular", "summer-light", "winter-layered"],
    poseStates: ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"],
    promotionStatus: "queued",
    paletteRef: "tower-default",
    motionProfile: "profile",
    artDirectionNotes: "notes",
  };
}

const SOL = makeChar({ id: "sol-navarro", roleSlug: "cno" });
const MARA = makeChar({ id: "mara-vance", roleSlug: "ceo" });
const FIXTURES: readonly ArtLabCharacterCanon[] = [SOL, MARA];

describe("resolveCanonCharacter", () => {
  it("returns the character when idOrRoleSlug matches header.id (no log)", () => {
    const log = vi.fn();
    const result = resolveCanonCharacter(FIXTURES, "sol-navarro", { log });
    expect(result).toBe(SOL);
    expect(log).not.toHaveBeenCalled();
  });

  it("returns the character when idOrRoleSlug matches only roleSlug and logs the fallback", () => {
    const log = vi.fn();
    const result = resolveCanonCharacter(FIXTURES, "cno", { log });
    expect(result).toBe(SOL);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      level: "info",
      event: "canon-roleslug-fallback",
      idOrRoleSlug: "cno",
      resolvedHeaderId: "sol-navarro",
      resolvedRoleSlug: "cno",
    });
  });

  it("returns undefined when neither header.id nor roleSlug matches (no log)", () => {
    const log = vi.fn();
    const result = resolveCanonCharacter(FIXTURES, "nonexistent", { log });
    expect(result).toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it("prefers header.id match over roleSlug match when both could resolve (defensive)", () => {
    // Defensive: if some character's roleSlug accidentally equals another
    // character's header.id, the header.id match must win and no log fires.
    const collidingA = makeChar({ id: "cno", roleSlug: "cno-alt" });
    const collidingB = makeChar({ id: "sol-navarro", roleSlug: "cno" });
    const log = vi.fn();
    const result = resolveCanonCharacter([collidingA, collidingB], "cno", { log });
    expect(result).toBe(collidingA);
    expect(log).not.toHaveBeenCalled();
  });

  it("works without an options.log callback on the fallback path", () => {
    const result = resolveCanonCharacter(FIXTURES, "cno");
    expect(result).toBe(SOL);
  });

  it("works without options at all on the header.id path", () => {
    const result = resolveCanonCharacter(FIXTURES, "sol-navarro");
    expect(result).toBe(SOL);
  });
});
