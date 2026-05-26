import { describe, expect, it } from "vitest";
import { validateArtLabCanon, type ArtLabCanonValidationReport } from "./validate";
import type { ArtLabCanon } from "./load-canon";
import type { ArtLabCharacterCanon } from "./character-schema";
import type { ArtLabPaletteCanon } from "./palette-schema";

const FAKE_CHAR = (id: string, paletteRef = "tower-default"): ArtLabCharacterCanon =>
  ({
    header: { kind: "character", schemaVersion: "1.0.0", id, revisedAt: "2026-05-25T00:00:00.000Z" },
    displayName: "X",
    shortLabel: "X",
    title: "X",
    floorId: "x",
    floorLabel: "x",
    styleEnvelope: "tower-flat-plus-depth-v1",
    visualArchetype: "x",
    silhouette: "x",
    wardrobe: "x",
    props: ["x"],
    mobileRead: "x",
    negativeDNA: "x",
    accent: "x",
    doctrine: "x",
    flaw: "x",
    secretStrength: "x",
    wound: "x",
    outfitVariants: ["regular", "summer-light", "winter-layered"],
    poseStates: ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"],
    promotionStatus: "queued",
    paletteRef,
    motionProfile: "x",
    artDirectionNotes: "x",
  }) as ArtLabCharacterCanon;

const FAKE_PALETTE = (id: string): ArtLabPaletteCanon =>
  ({
    header: { kind: "palette", schemaVersion: "1.0.0", id, revisedAt: "2026-05-25T00:00:00.000Z" },
    scope: "global",
    tokens: { primaryDark: "#1A1A2E" },
  }) as ArtLabPaletteCanon;

const FAKE_CANON = (chars: ArtLabCharacterCanon[], palettes: ArtLabPaletteCanon[]): ArtLabCanon =>
  ({
    characters: chars,
    palettes,
    typography: [],
    motionLanguage: [],
    spaceTokens: [],
    iconographyRules: [],
    loadDurationMs: 0,
    sourceFiles: [],
  }) as ArtLabCanon;

describe("validateArtLabCanon", () => {
  it("returns ok=true when every paletteRef resolves", () => {
    const report: ArtLabCanonValidationReport = validateArtLabCanon(
      FAKE_CANON([FAKE_CHAR("c1")], [FAKE_PALETTE("tower-default")]),
    );
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("flags unresolved paletteRef", () => {
    const report = validateArtLabCanon(FAKE_CANON([FAKE_CHAR("c1", "missing-palette")], []));
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "palette-ref-unresolved")).toBe(true);
  });

  it("flags zero characters in canon", () => {
    const report = validateArtLabCanon(FAKE_CANON([], [FAKE_PALETTE("tower-default")]));
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "canon-empty-character-set")).toBe(true);
  });

  it("returns ok=true on real disk canon", async () => {
    const { loadArtLabCanon } = await import("./load-canon");
    const canon = await loadArtLabCanon({ canonRoot: `${process.cwd()}/docs/foundry/canon` });
    const report = validateArtLabCanon(canon);
    expect(report.ok).toBe(true);
  });
});
