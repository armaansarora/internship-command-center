import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderArtLabIntegrationSnippet } from "./integration-snippet";
import type { ArtLabAssetPackManifest } from "./manifest.schema";

const OTIS_MANIFEST: ArtLabAssetPackManifest = {
  manifestVersion: "1.0.0",
  packId: "01970000-0000-7000-8000-000000000001",
  kind: "character-sprite",
  agent: "character-master",
  canonRefs: { characterId: "otis", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
  dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 170, displayHeightPx: 290, aspectRatio: "9:16" },
  colorTokensUsed: ["primaryDark", "goldAccent"],
  intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
  gsapCues: [],
  accessibility: { altText: "Otis the concierge, idle pose", role: "img", prefersReducedMotionStrategy: "static-fallback" },
  integrationSnippetTemplate: "character-sprite-img",
  payload: {
    files: [{ relPath: "idle.webp", sha256: "0".repeat(64), bytes: 14600 }],
    primaryFileRelPath: "idle.webp",
  },
  generation: { agentName: "character-master", provider: "gemini-2.5-flash-image", modelId: "gemini-2.5-flash-image", seed: 1, costCents: 4, durationMs: 18000, generatedAt: "2026-05-25T00:00:00.000Z" },
};

describe("renderArtLabIntegrationSnippet", () => {
  it("renders the golden character-sprite snippet", () => {
    const golden = readFileSync(join(__dirname, "__fixtures__", "golden-character-sprite-snippet.tsx"), "utf8");
    const rendered = renderArtLabIntegrationSnippet(OTIS_MANIFEST);
    expect(rendered.trim()).toBe(golden.trim());
  });

  it("emits a GSAP block when requiresGsap is true", () => {
    const m: ArtLabAssetPackManifest = {
      ...OTIS_MANIFEST,
      intendedSlot: { ...OTIS_MANIFEST.intendedSlot, requiresGsap: true },
      gsapCues: [
        { cueId: "entrance", targetSelector: "[data-otis]", timeline: "fadeUp", durationMs: 320, easing: "power3.out" },
      ],
      integrationSnippetTemplate: "character-sprite-gsap",
    };
    const rendered = renderArtLabIntegrationSnippet(m);
    expect(rendered).toMatch(/useEffect/);
    expect(rendered).toMatch(/gsap-init/);
    expect(rendered).toMatch(/return\s*\(\s*\)\s*=>/);
  });

  it("throws on unknown integrationSnippetTemplate", () => {
    expect(() =>
      renderArtLabIntegrationSnippet({ ...OTIS_MANIFEST, integrationSnippetTemplate: "rogue-template" }),
    ).toThrow();
  });

  describe("code-injection hardening for interpolated string slots", () => {
    // Reviewer attack vector: a manifest whose schema only enforces
    // `z.string().min(1)` can put arbitrary characters into altText,
    // targetSelector, easing, etc. The previous template wrapped those
    // values in bare double quotes, e.g. `alt="${m.accessibility.altText}"`,
    // so `altText: 'x" onerror="alert(1)'` would smuggle an `onerror`
    // attribute into the generated JSX. The fix is to interpolate these
    // fields as JSON-stringified literals so the output is always a
    // single, properly-escaped string token.

    it("quotes altText as a JSON string literal (no attribute injection)", () => {
      const malicious = 'x" onerror="alert(1)';
      const rendered = renderArtLabIntegrationSnippet({
        ...OTIS_MANIFEST,
        accessibility: { ...OTIS_MANIFEST.accessibility, altText: malicious },
      });
      // The exact JSON-stringified payload must appear verbatim — the inner
      // `"` is escaped to `\"`, so no second attribute can ever be opened.
      expect(rendered).toContain(`alt=${JSON.stringify(malicious)}`);
      // The raw, attribute-breaking form must not appear.
      expect(rendered).not.toContain(`alt="${malicious}"`);
      // Belt-and-braces: the inner `"` must be escaped (`\"`) so the JSX
      // parser sees a single string literal, not two attributes.
      expect(rendered).toContain('\\"');
    });

    it("quotes altText for the GSAP template too", () => {
      const malicious = 'x" onerror="alert(2)';
      const rendered = renderArtLabIntegrationSnippet({
        ...OTIS_MANIFEST,
        intendedSlot: { ...OTIS_MANIFEST.intendedSlot, requiresGsap: true },
        gsapCues: [
          { cueId: "entrance", targetSelector: "[data-otis]", timeline: "fadeUp", durationMs: 320, easing: "power3.out" },
        ],
        integrationSnippetTemplate: "character-sprite-gsap",
        accessibility: { ...OTIS_MANIFEST.accessibility, altText: malicious },
      });
      expect(rendered).toContain(`alt=${JSON.stringify(malicious)}`);
      // Quote escape must be present — proves we did not splice raw bytes.
      expect(rendered).toContain('\\"');
    });

    it("quotes targetSelector so it cannot break the gsap.fromTo call", () => {
      const maliciousSelector = '" onload="alert(1)';
      const rendered = renderArtLabIntegrationSnippet({
        ...OTIS_MANIFEST,
        intendedSlot: { ...OTIS_MANIFEST.intendedSlot, requiresGsap: true },
        gsapCues: [
          {
            cueId: "entrance",
            targetSelector: maliciousSelector,
            timeline: "fadeUp",
            durationMs: 320,
            easing: "power3.out",
          },
        ],
        integrationSnippetTemplate: "character-sprite-gsap",
      });
      // The selector arrives as the first arg to gsap.fromTo — must be a
      // single JSON-quoted string literal, never a bare `"…"` that could
      // be closed early.
      expect(rendered).toContain(`fromTo(${JSON.stringify(maliciousSelector)},`);
      expect(rendered).not.toContain(`fromTo("${maliciousSelector}"`);
    });

    it("quotes easing so it cannot smuggle a function call", () => {
      // A malicious string containing an embedded double-quote which the
      // old code would close prematurely. With JSON.stringify, the `"`
      // is escaped to `\"`, keeping the whole payload inside one string.
      const maliciousEasing = '")); evil(); gsap.timeline(); //';
      const rendered = renderArtLabIntegrationSnippet({
        ...OTIS_MANIFEST,
        intendedSlot: { ...OTIS_MANIFEST.intendedSlot, requiresGsap: true },
        gsapCues: [
          {
            cueId: "entrance",
            targetSelector: "[data-otis]",
            timeline: "fadeUp",
            durationMs: 320,
            easing: maliciousEasing,
          },
        ],
        integrationSnippetTemplate: "character-sprite-gsap",
      });
      // Easing is interpolated as the value of `ease:` — must be quoted
      // using JSON.stringify so the inner `"` is escaped to `\"`.
      expect(rendered).toContain(`ease: ${JSON.stringify(maliciousEasing)}`);
      // The raw concatenation (`ease: "..."` with unescaped embedded `"`)
      // that the old code emitted must not appear.
      expect(rendered).not.toContain(`ease: "${maliciousEasing}"`);
      // The escape sequence `\"` must be present — proves the inner
      // double-quote was neutralised rather than terminating the string.
      expect(rendered).toContain('\\"');
    });

    it("still renders the existing golden fixture unchanged for benign input", () => {
      // Regression guard: JSON.stringify("Otis the concierge, idle pose")
      // === '"Otis the concierge, idle pose"', so the golden snippet is
      // byte-identical to the previous output for safe strings.
      const golden = readFileSync(
        join(__dirname, "__fixtures__", "golden-character-sprite-snippet.tsx"),
        "utf8",
      );
      const rendered = renderArtLabIntegrationSnippet(OTIS_MANIFEST);
      expect(rendered.trim()).toBe(golden.trim());
    });
  });
});
