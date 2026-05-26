import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderFoundryIntegrationSnippet } from "./integration-snippet";
import type { FoundryAssetPackManifest } from "./manifest.schema";

const OTIS_MANIFEST: FoundryAssetPackManifest = {
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

describe("renderFoundryIntegrationSnippet", () => {
  it("renders the golden character-sprite snippet", () => {
    const golden = readFileSync(join(__dirname, "__fixtures__", "golden-character-sprite-snippet.tsx"), "utf8");
    const rendered = renderFoundryIntegrationSnippet(OTIS_MANIFEST);
    expect(rendered.trim()).toBe(golden.trim());
  });

  it("emits a GSAP block when requiresGsap is true", () => {
    const m: FoundryAssetPackManifest = {
      ...OTIS_MANIFEST,
      intendedSlot: { ...OTIS_MANIFEST.intendedSlot, requiresGsap: true },
      gsapCues: [
        { cueId: "entrance", targetSelector: "[data-otis]", timeline: "fadeUp", durationMs: 320, easing: "power3.out" },
      ],
      integrationSnippetTemplate: "character-sprite-gsap",
    };
    const rendered = renderFoundryIntegrationSnippet(m);
    expect(rendered).toMatch(/useEffect/);
    expect(rendered).toMatch(/gsap-init/);
    expect(rendered).toMatch(/return\s*\(\s*\)\s*=>/);
  });

  it("throws on unknown integrationSnippetTemplate", () => {
    expect(() =>
      renderFoundryIntegrationSnippet({ ...OTIS_MANIFEST, integrationSnippetTemplate: "rogue-template" }),
    ).toThrow();
  });
});
