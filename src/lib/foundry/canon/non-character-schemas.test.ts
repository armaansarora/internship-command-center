// src/lib/foundry/canon/non-character-schemas.test.ts
import { describe, expect, it } from "vitest";
import { FoundryPaletteCanonSchema } from "./palette-schema";
import { FoundryTypographyCanonSchema } from "./typography-schema";
import { FoundryMotionLanguageCanonSchema } from "./motion-language-schema";
import { FoundrySpaceTokensCanonSchema } from "./space-tokens-schema";
import { FoundryIconographyRulesCanonSchema } from "./iconography-rules-schema";

const COMMON_HEADER = (kind: string, id: string) => ({
  kind,
  schemaVersion: "1.0.0" as const,
  id,
  revisedAt: "2026-05-25T00:00:00.000Z",
});

describe("FoundryPaletteCanonSchema", () => {
  it("accepts the tower-default palette", () => {
    expect(() =>
      FoundryPaletteCanonSchema.parse({
        header: COMMON_HEADER("palette", "tower-default"),
        scope: "global",
        tokens: {
          primaryDark: "#1A1A2E",
          goldAccent: "#C9A84C",
          glassFill: "rgba(255,255,255,0.04)",
        },
        notes: "Tower master palette — used unless a floor variant overrides.",
      }),
    ).not.toThrow();
  });

  it("rejects when scope is unknown", () => {
    expect(() =>
      FoundryPaletteCanonSchema.parse({
        header: COMMON_HEADER("palette", "x"),
        scope: "rogue",
        tokens: { x: "#000" },
      }),
    ).toThrow();
  });
});

describe("FoundryTypographyCanonSchema", () => {
  it("accepts a typography ramp", () => {
    expect(() =>
      FoundryTypographyCanonSchema.parse({
        header: COMMON_HEADER("typography", "tower-default"),
        families: {
          heading: "Playfair Display",
          body: "Satoshi",
          mono: "JetBrains Mono",
        },
        ramp: [
          { token: "h1", sizePx: 72, weight: 600, lineHeight: 1.05 },
          { token: "body", sizePx: 16, weight: 400, lineHeight: 1.5 },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects when ramp is empty", () => {
    expect(() =>
      FoundryTypographyCanonSchema.parse({
        header: COMMON_HEADER("typography", "x"),
        families: { heading: "x", body: "y", mono: "z" },
        ramp: [],
      }),
    ).toThrow();
  });
});

describe("FoundryMotionLanguageCanonSchema", () => {
  it("accepts a motion language record", () => {
    expect(() =>
      FoundryMotionLanguageCanonSchema.parse({
        header: COMMON_HEADER("motion-language", "tower-default"),
        easings: { primary: "power3.out", entrance: "expo.out" },
        durations: { instant: 80, fast: 180, base: 320, slow: 520 },
        principles: ["respect-prefers-reduced-motion", "no-motion-sickness"],
      }),
    ).not.toThrow();
  });

  it("rejects negative durations", () => {
    expect(() =>
      FoundryMotionLanguageCanonSchema.parse({
        header: COMMON_HEADER("motion-language", "x"),
        easings: { primary: "ease" },
        durations: { fast: -10 },
        principles: [],
      }),
    ).toThrow();
  });
});

describe("FoundrySpaceTokensCanonSchema", () => {
  it("accepts a space tokens record", () => {
    expect(() =>
      FoundrySpaceTokensCanonSchema.parse({
        header: COMMON_HEADER("space-tokens", "tower-default"),
        gutterPx: 24,
        radiusPx: { sm: 4, md: 8, lg: 16, pill: 999 },
        glassBlurPx: 16,
        glassOpacity: 0.88,
      }),
    ).not.toThrow();
  });

  it("rejects opacity > 1", () => {
    expect(() =>
      FoundrySpaceTokensCanonSchema.parse({
        header: COMMON_HEADER("space-tokens", "x"),
        gutterPx: 24,
        radiusPx: { md: 8 },
        glassBlurPx: 16,
        glassOpacity: 1.2,
      }),
    ).toThrow();
  });
});

describe("FoundryIconographyRulesCanonSchema", () => {
  it("accepts an iconography rules record", () => {
    expect(() =>
      FoundryIconographyRulesCanonSchema.parse({
        header: COMMON_HEADER("iconography-rules", "tower-default"),
        strokeWidthPx: 1.5,
        cornerRadiusPx: 2,
        weight: "regular",
        gridSizePx: 24,
        forbiddenStyles: ["bicolor", "gradient-fill"],
      }),
    ).not.toThrow();
  });

  it("rejects when weight is unknown", () => {
    expect(() =>
      FoundryIconographyRulesCanonSchema.parse({
        header: COMMON_HEADER("iconography-rules", "x"),
        strokeWidthPx: 1.5,
        cornerRadiusPx: 2,
        weight: "rogue",
        gridSizePx: 24,
        forbiddenStyles: [],
      }),
    ).toThrow();
  });
});
