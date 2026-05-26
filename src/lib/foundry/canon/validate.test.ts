import { describe, expect, it } from "vitest";
import { validateFoundryCanon, type FoundryCanonValidationReport } from "./validate";
import type { FoundryCanon } from "./load-canon";
import type { FoundryCharacterCanon } from "./character-schema";
import type { FoundryPaletteCanon } from "./palette-schema";

const FAKE_CHAR = (id: string, paletteRef = "tower-default"): FoundryCharacterCanon =>
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
  }) as FoundryCharacterCanon;

const FAKE_PALETTE = (id: string): FoundryPaletteCanon =>
  ({
    header: { kind: "palette", schemaVersion: "1.0.0", id, revisedAt: "2026-05-25T00:00:00.000Z" },
    scope: "global",
    tokens: { primaryDark: "#1A1A2E" },
  }) as FoundryPaletteCanon;

const FAKE_CANON = (chars: FoundryCharacterCanon[], palettes: FoundryPaletteCanon[]): FoundryCanon =>
  ({
    characters: chars,
    palettes,
    typography: [],
    motionLanguage: [],
    spaceTokens: [],
    iconographyRules: [],
    loadDurationMs: 0,
    sourceFiles: [],
  }) as FoundryCanon;

describe("validateFoundryCanon", () => {
  it("returns ok=true when every paletteRef resolves", () => {
    const report: FoundryCanonValidationReport = validateFoundryCanon(
      FAKE_CANON([FAKE_CHAR("c1")], [FAKE_PALETTE("tower-default")]),
    );
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("flags unresolved paletteRef", () => {
    const report = validateFoundryCanon(FAKE_CANON([FAKE_CHAR("c1", "missing-palette")], []));
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "palette-ref-unresolved")).toBe(true);
  });

  it("flags zero characters in canon", () => {
    const report = validateFoundryCanon(FAKE_CANON([], [FAKE_PALETTE("tower-default")]));
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "canon-empty-character-set")).toBe(true);
  });

  it("returns ok=true on real disk canon", async () => {
    const { loadFoundryCanon } = await import("./load-canon");
    const canon = await loadFoundryCanon({ canonRoot: `${process.cwd()}/docs/foundry/canon` });
    const report = validateFoundryCanon(canon);
    expect(report.ok).toBe(true);
  });
});
