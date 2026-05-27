// src/lib/artlab/sdk/canon/character-schema.test.ts
import { describe, expect, it } from "vitest";
import { ArtLabCharacterCanonSchema } from "./character-schema";

const VALID_CHARACTER = {
  header: {
    kind: "character" as const,
    schemaVersion: "1.0.0" as const,
    id: "sol-navarro",
    revisedAt: "2026-05-25T00:00:00.000Z",
  },
  roleSlug: "cno",
  displayName: "Sol Navarro",
  shortLabel: "Sol",
  title: "Chief Networking Officer",
  floorId: "rolodex-lounge",
  floorLabel: "Floor 6 — The Rolodex Lounge",
  styleEnvelope: "tower-flat-plus-depth-v1",
  visualArchetype: "warm-precise-relationship-curator",
  silhouette: "compact-shoulder-line, controlled-hair-volume, contact-card-prop",
  wardrobe: "neutral-blazer, soft-collared-blouse, subtle-jewelry",
  props: ["contact-card", "felt-tip-pen"],
  mobileRead: "warm-eyes-first, hand-prop-second, posture-third",
  negativeDNA: "no-sales-energy, no-toothy-grin, no-loud-color",
  accent: "burnt-orange-pocket-square",
  doctrine: "every-relationship-deserves-attention",
  flaw: "over-commits-emotionally",
  secretStrength: "remembers-everything",
  wound: "betrayed-by-a-mentor",
  outfitVariants: ["regular", "summer-light", "winter-layered"],
  poseStates: ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"],
  promotionStatus: "queued" as const,
  paletteRef: "tower-default",
  motionProfile: "networking-warm",
  artDirectionNotes: "Sol should feel socially open and precise, with contact-card warmth instead of sales energy.",
};

describe("ArtLabCharacterCanonSchema", () => {
  it("accepts a valid character record", () => {
    expect(() => ArtLabCharacterCanonSchema.parse(VALID_CHARACTER)).not.toThrow();
  });

  it("rejects when outfitVariants is empty", () => {
    expect(() =>
      ArtLabCharacterCanonSchema.parse({ ...VALID_CHARACTER, outfitVariants: [] }),
    ).toThrow();
  });

  it("rejects when poseStates is missing the canonical 7", () => {
    expect(() =>
      ArtLabCharacterCanonSchema.parse({ ...VALID_CHARACTER, poseStates: ["idle"] }),
    ).toThrow();
  });

  it("rejects unknown promotionStatus", () => {
    expect(() =>
      ArtLabCharacterCanonSchema.parse({ ...VALID_CHARACTER, promotionStatus: "rogue" }),
    ).toThrow();
  });

  it("rejects when header.kind is not 'character'", () => {
    expect(() =>
      ArtLabCharacterCanonSchema.parse({
        ...VALID_CHARACTER,
        header: { ...VALID_CHARACTER.header, kind: "palette" },
      }),
    ).toThrow();
  });

  it("rejects when roleSlug is missing", () => {
    const { roleSlug: _roleSlug, ...withoutRoleSlug } = VALID_CHARACTER;
    expect(() => ArtLabCharacterCanonSchema.parse(withoutRoleSlug)).toThrow();
  });

  it("rejects when roleSlug is not lowercase kebab-case", () => {
    expect(() =>
      ArtLabCharacterCanonSchema.parse({ ...VALID_CHARACTER, roleSlug: "CNO" }),
    ).toThrow();
    expect(() =>
      ArtLabCharacterCanonSchema.parse({ ...VALID_CHARACTER, roleSlug: "cno_alt" }),
    ).toThrow();
    expect(() =>
      ArtLabCharacterCanonSchema.parse({ ...VALID_CHARACTER, roleSlug: "cno test" }),
    ).toThrow();
  });
});
