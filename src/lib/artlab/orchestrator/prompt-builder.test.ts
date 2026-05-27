// src/lib/artlab/orchestrator/prompt-builder.test.ts
//
// Identity-anchor regression tests. Production-slot prompts already lock
// identity to an approved lane via the IDENTITY ANCHOR line. Concept-gen
// runs BEFORE any lane is approved, so the anchor target is canon — and
// the same anchor sentence must land in:
//   • every canonical-fallback lane prompt
//   • the underlying single-image prompt those lanes wrap
// These tests pin the byte-identical anchor string so future edits can't
// drift it.

import { describe, expect, it } from "vitest";
import type { TowerCharacterContext, TowerContextBundle } from "@/lib/artlab/context/tower-context";
import type { ArtLabLlmBrain } from "./llm-brain";
import { buildConceptLanePrompts } from "./prompt-builder";

const IDENTITY_ANCHOR = "Match exact face/hair/skin/age/proportions/palette from canon. Vary ONLY styling/wardrobe/pose — never identity.";

function makeSolContext(): TowerCharacterContext {
  return {
    characterId: "cno",
    displayName: "Sol Navarro",
    firstName: "Sol",
    shortLabel: "CNO",
    title: "Chief Networking Officer",
    space: "rolodex-lounge",
    accent: "#5DAA78",
    visualArchetype: "Warm relationship strategist with socially precise ease.",
    silhouette: "Open shoulders, relaxed lounge posture, approachable polish.",
    wardrobe: "Soft tailored jacket, brass-green accents, lived-in refinement.",
    props: "Contact cards, phone, coffee note, intro card.",
    mobileRead: "Open stance plus contact-card prop and green accent.",
    negativeDNA: "No manipulative grin, spammy sales posture, party promoter outfit, or heart motif.",
    artDirectionNotes: "",
    conceptBoardPrompt: "",
    posePackPromptTemplate: "",
    negativePrompt: "No manipulative grin, spammy sales posture, party promoter outfit, or heart motif.",
    wound: "",
    doctrine: "",
    flaw: "",
    secretStrength: "",
    comedicEngine: "",
    visualDNA: "",
    forbiddenVisualTraits: "",
    promptFragments: "",
    recentStyleWins: [],
    recentRejections: [],
    promotedAssetCount: 0,
  };
}

function makeBundle(ctx: TowerCharacterContext): TowerContextBundle {
  return {
    loadedAt: new Date(0).toISOString(),
    styleEnvelope: {
      id: "tower-flat-plus-depth-v1",
      storyTone: "Professional Scars",
      visualNorthStar: "",
      styleRules: "",
      negativePromptRules: "",
    },
    characters: { [ctx.characterId]: ctx },
    floors: {},
    visionSpec: { coreMetaphor: "", floorDirectory: "" },
    protectedAssets: {
      lobbyBackgrounds: [],
      byteProtectedCharacters: [],
    },
  };
}

// A brain stub that always throws — forces buildConceptLanePrompts down the
// canonical-fallback path. The fallback is the path actually shipped when the
// brain is unavailable, so testing it is the right canary.
const throwingBrain: ArtLabLlmBrain = {
  async decide() {
    throw new Error("test: brain forced into fallback");
  },
};

describe("buildConceptLanePrompts (canonical fallback) — identity anchor", () => {
  it("includes the identity anchor on EVERY one of the 5 lanes", async () => {
    const ctx = makeSolContext();
    const bundle = makeBundle(ctx);
    const result = await buildConceptLanePrompts({
      characterId: ctx.characterId,
      workspaceRoot: "/tmp/unused",
      brain: throwingBrain,
      bundle,
    });
    expect(result.source).toBe("canonical-fallback");
    expect(result.prompts).toHaveLength(5);
    for (const lane of result.prompts) {
      expect(lane.prompt).toContain(IDENTITY_ANCHOR);
    }
  });

  it("includes the identity anchor in the embedded single-image prompt portion of lane 1", async () => {
    // Case 2 from the task spec: buildSingleImagePrompt is not exported. We
    // verify its anchor surfaces by checking lane 1's output (which is built
    // by wrapping buildSingleImagePrompt). Two anchor occurrences are expected
    // per lane: one from the single-image IDENTITY block, one as its own
    // paragraph between `base` and `THIS LANE`.
    const ctx = makeSolContext();
    const bundle = makeBundle(ctx);
    const result = await buildConceptLanePrompts({
      characterId: ctx.characterId,
      workspaceRoot: "/tmp/unused",
      brain: throwingBrain,
      bundle,
    });
    const lane1 = result.prompts[0]!;
    const occurrences = lane1.prompt.split(IDENTITY_ANCHOR).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("matches the sol-navarro lane #1 fallback snapshot verbatim", async () => {
    const ctx = makeSolContext();
    const bundle = makeBundle(ctx);
    const result = await buildConceptLanePrompts({
      characterId: ctx.characterId,
      workspaceRoot: "/tmp/unused",
      brain: throwingBrain,
      bundle,
    });
    const lane1 = result.prompts[0]!;
    expect(lane1.variationAxis).toBe("younger-sharp-crop");
    expect(lane1.prompt).toMatchInlineSnapshot(`
      "Design Sol Navarro, the Chief Networking Officer of The Tower (an immersive internship command-center skyscraper).

      STYLE — premium painterly editorial character illustration, like a luxury video-game character portrait card or a high-end art-of book cover:
        • Rich painterly brushwork with subtle gradient shading and dimensional volume.
        • Deep, saturated colors with soft cinematic studio lighting (warm key from upper-front, gentle cool fill).
        • Detailed face anatomy with grounded realistic proportions — a real person you'd see on a luxury book cover, not a stylized avatar.
        • Crisp clean rendering with smooth shading transitions; wardrobe fabrics have visible weight and texture (wool, twill, fine knit).
        • Strong mobile-readable silhouette without sacrificing detail.
        • Subtle ambient occlusion around the figure's feet anchoring them to the ground plane.
        • NOT flat vector art, NOT cell-shaded cartoon, NOT corporate-startup illustration, NOT minimal-flat-style, NOT chibi, NOT anime, NOT 3D-rendered, NOT photorealistic photography.
        • Reference quality: think Square Enix or Riot Games character art card, or a Pixar/Disney concept-art painting refined for an editorial luxury brand.

      IDENTITY (from canonical bible — do not deviate):
        • Visual archetype: Warm relationship strategist with socially precise ease.
        • Silhouette: Open shoulders, relaxed lounge posture, approachable polish.
        • Wardrobe: Soft tailored jacket, brass-green accents, lived-in refinement.
        • Signature props: Contact cards, phone, coffee note, intro card.
        • Mobile read: Open stance plus contact-card prop and green accent.
        • Color accent (lead color in palette): #5DAA78
        • Match exact face/hair/skin/age/proportions/palette from canon. Vary ONLY styling/wardrobe/pose — never identity.

      Match exact face/hair/skin/age/proportions/palette from canon. Vary ONLY styling/wardrobe/pose — never identity.

      THIS LANE — younger-sharp-crop: Younger interpretation (early 30s). Short, sharply cropped hair. Confident editorial palette emphasis with the canonical accent leading the wardrobe.

      COMPOSITION:
        • Single full-body figure, centered, 9:16 portrait framing.
        • Solid neutral pastel-cream backdrop (#F4E8D3) with high subject-background separation. NO patterned walls, NO furniture, NO scenery, NO environmental props beyond the character's own signature items.
        • Soft ambient occlusion shadow under the feet only — no touching dramatic shadow, no cast shadow on the backdrop.
        • Generous safe padding around the figure for downstream cutout work.

      AVOID — these break the Tower envelope: No manipulative grin, spammy sales posture, party promoter outfit, or heart motif.. No flat vector cartoon, no cell-shaded webcomic style, no corporate-startup illustration, no Slack-onboarding doodle look, no minimal-flat-illustration, no chibi proportions, no anime, no 3D render, no photography or photorealistic skin texture, no environmental scenic background, no visible text or logos or watermarks."
    `);
  });
});
