// src/lib/artlab/orchestrator/prompt-builder.ts
//
// Turns a Tower context bundle into per-slot Gemini prompts. The brain
// (Claude) authors the prompt VARIATIONS; this module assembles inputs,
// invokes the brain, validates the JSON shape, and falls back to a
// canonical-bible prompt if the brain is unavailable / returns malformed JSON.

import { loadTowerContext, pickCharacterContext, pickFloorContext, type TowerContextBundle, type TowerCharacterContext } from "@/lib/artlab/context/tower-context";
import { summariseFeedbackForBrain } from "@/lib/artlab/memory/feedback-summary";
import type { ArtLabLlmBrain } from "./llm-brain";

export interface BuildConceptLanePromptsInput {
  characterId: string;
  workspaceRoot: string;
  brain: ArtLabLlmBrain;
  bundle?: TowerContextBundle;
}

export interface ConceptLanePrompt {
  laneIndex: number;
  prompt: string;
  variationAxis: string;
}

export interface BuildConceptLanePromptsResult {
  prompts: ConceptLanePrompt[];
  source: "brain" | "canonical";
  characterContext: TowerCharacterContext;
}

export async function buildConceptLanePrompts(input: BuildConceptLanePromptsInput): Promise<BuildConceptLanePromptsResult> {
  const bundle = input.bundle ?? await loadTowerContext({ workspaceRoot: input.workspaceRoot });
  const ctx = pickCharacterContext(bundle, input.characterId);
  if (!ctx) {
    throw new Error(`prompt-builder: no character context for "${input.characterId}"`);
  }

  // Brain decides how to vary the 5 lanes. The canonical concept-board prompt
  // from CHARACTER-IMAGE-PROMPTS.md is the "seed" — the brain produces
  // variations on stance/age/hair/prop/palette axes.
  //
  // Brain failures (bad ANTHROPIC_API_KEY, rate-limit, network) are NOT fatal:
  // we have a deterministic bible-derived fallback that produces 5 reasonable
  // canonical prompts. Real Gemini still runs against those prompts — the
  // user only loses brain-authored creativity, not real images.
  try {
    const result = await input.brain.decide({
      kind: "generate-concept-prompts",
      input: {
        characterId: ctx.characterId,
        displayName: ctx.displayName,
        title: ctx.title,
        space: ctx.space,
        characterContext: {
          visualArchetype: ctx.visualArchetype,
          silhouette: ctx.silhouette,
          wardrobe: ctx.wardrobe,
          props: ctx.props,
          mobileRead: ctx.mobileRead,
          negativeDNA: ctx.negativeDNA,
          accent: ctx.accent,
          wound: ctx.wound,
          doctrine: ctx.doctrine,
          flaw: ctx.flaw,
          secretStrength: ctx.secretStrength,
          comedicEngine: ctx.comedicEngine,
          visualDNA: ctx.visualDNA,
          forbiddenVisualTraits: ctx.forbiddenVisualTraits,
          promptFragments: ctx.promptFragments,
        },
        canonicalConceptBoardPrompt: ctx.conceptBoardPrompt,
        negativePrompt: ctx.negativePrompt,
        styleEnvelope: {
          id: bundle.styleEnvelope.id,
          storyTone: bundle.styleEnvelope.storyTone,
        },
        recentMemory: summariseFeedbackForBrain(ctx.recentStyleWins, ctx.recentRejections),
        targetLanes: 5,
      },
    });
    const parsed = parseLanePromptsOutput(result.outputJson);
    if (parsed && parsed.length === 5) {
      return { prompts: parsed, source: "brain", characterContext: ctx };
    }
  } catch {
    // brain unavailable — fall through to canonical fallback
  }
  return { prompts: canonicalFallbackPrompts(ctx), source: "canonical", characterContext: ctx };
}

function parseLanePromptsOutput(json: unknown): ConceptLanePrompt[] | null {
  if (!json || typeof json !== "object") return null;
  const arr = (json as { prompts?: unknown }).prompts;
  if (!Array.isArray(arr)) return null;
  const out: ConceptLanePrompt[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const i = item as { laneIndex?: unknown; prompt?: unknown; variationAxis?: unknown };
    if (typeof i.laneIndex !== "number" || typeof i.prompt !== "string") continue;
    out.push({
      laneIndex: i.laneIndex,
      prompt: i.prompt,
      variationAxis: typeof i.variationAxis === "string" ? i.variationAxis : "unspecified",
    });
  }
  out.sort((a, b) => a.laneIndex - b.laneIndex);
  return out.length === 5 ? out : null;
}

// If the brain is unavailable, fall back to 5 deterministic axis-based prompts
// built directly from the canonical concept-board prompt in
// docs/CHARACTER-IMAGE-PROMPTS.md. Each axis is a documented allowed
// variation per CHARACTER-PIPELINE.md.
// Each lane varies on multiple axes (age, hair, posture, signature-prop
// arrangement, color emphasis) so the 5 directions actually look like
// 5 different design takes — not 5 stance variations of the same face.
// Lane axes intentionally vary on IDENTITY-side dimensions only — age, hair
// geometry, face character, palette emphasis. POSE/STANCE is the slot
// runner's job (idle/greeting/listening/etc.) and must NOT be baked into
// lane definitions, otherwise all 21 production sprites inherit the lane's
// pose and look identical regardless of slot.
const FALLBACK_AXES = [
  {
    axis: "younger-sharp-crop",
    clause: "Younger interpretation (early 30s). Short, sharply cropped hair. Confident editorial palette emphasis with the canonical accent leading the wardrobe.",
  },
  {
    axis: "mid-career-textured",
    clause: "Mid-career (early 40s) with a hint of stubble or defined jawline. Hair slightly textured. Wardrobe deepens the canonical palette toward richer tones.",
  },
  {
    axis: "late-thirties-styled",
    clause: "Late 30s with longer styled hair or pronounced hair geometry. Warm focused eyes. Canonical palette held true.",
  },
  {
    axis: "senior-silver",
    clause: "Senior interpretation (early 50s) with distinguished gray at the temples or fuller silver. Wardrobe leans into structured tailored cuts.",
  },
  {
    axis: "characterful-glasses",
    clause: "Mid-40s with glasses or another characterful face detail (mole, scar, signature mark). Lighter, more inviting reading of the canonical palette.",
  },
];

function canonicalFallbackPrompts(ctx: TowerCharacterContext): ConceptLanePrompt[] {
  // IMPORTANT: ctx.conceptBoardPrompt from CHARACTER-IMAGE-PROMPTS.md is a
  // META-prompt that instructs an LLM to author 5 image prompts. We must NOT
  // send it verbatim to an image model — it confuses the model (it tries to
  // "create 5 distinct prompt-only concept options" as if writing text).
  // Always build a single-subject image prompt from the bible fields instead.
  const base = buildSingleImagePrompt(ctx);
  const negative = ctx.negativePrompt || ctx.negativeDNA || "no celebrity likeness, fake text, logo, watermark, identity drift.";
  return FALLBACK_AXES.map((axis, idx) => ({
    laneIndex: idx + 1,
    prompt: [
      base,
      ``,
      `Match exact face/hair/skin/age/proportions/palette from canon. Vary ONLY styling/wardrobe/pose — never identity.`,
      ``,
      `THIS LANE — ${axis.axis}: ${axis.clause}`,
      ``,
      `COMPOSITION:`,
      `  • Single full-body figure, centered, 9:16 portrait framing.`,
      `  • Solid neutral pastel-cream backdrop (#F4E8D3) with high subject-background separation. NO patterned walls, NO furniture, NO scenery, NO environmental props beyond the character's own signature items.`,
      `  • Soft ambient occlusion shadow under the feet only — no touching dramatic shadow, no cast shadow on the backdrop.`,
      `  • Generous safe padding around the figure for downstream cutout work.`,
      ``,
      `AVOID — these break the Tower envelope: ${negative}. No flat vector cartoon, no cell-shaded webcomic style, no corporate-startup illustration, no Slack-onboarding doodle look, no minimal-flat-illustration, no chibi proportions, no anime, no 3D render, no photography or photorealistic skin texture, no environmental scenic background, no visible text or logos or watermarks.`,
    ].join("\n"),
    variationAxis: axis.axis,
  }));
}

// Build a single-subject image prompt from the bible fields. This is the
// shape Gemini expects for image generation: declarative description of
// ONE character, not instructions to generate multiple prompts.
//
// Style reference: Otis Vale and Mara Voss in public/art/lobby/otis and
// public/art/penthouse/ceo set the Tower bar — painterly luxury editorial
// illustration, NOT flat cell-shaded vector art. The prompt below is
// engineered to make Gemini reproduce that quality.
function buildSingleImagePrompt(ctx: TowerCharacterContext): string {
  const lines: string[] = [
    `Design ${ctx.displayName}, the ${ctx.title} of The Tower (an immersive internship command-center skyscraper).`,
    ``,
    `STYLE — premium painterly editorial character illustration, like a luxury video-game character portrait card or a high-end art-of book cover:`,
    `  • Rich painterly brushwork with subtle gradient shading and dimensional volume.`,
    `  • Deep, saturated colors with soft cinematic studio lighting (warm key from upper-front, gentle cool fill).`,
    `  • Detailed face anatomy with grounded realistic proportions — a real person you'd see on a luxury book cover, not a stylized avatar.`,
    `  • Crisp clean rendering with smooth shading transitions; wardrobe fabrics have visible weight and texture (wool, twill, fine knit).`,
    `  • Strong mobile-readable silhouette without sacrificing detail.`,
    `  • Subtle ambient occlusion around the figure's feet anchoring them to the ground plane.`,
    `  • NOT flat vector art, NOT cell-shaded cartoon, NOT corporate-startup illustration, NOT minimal-flat-style, NOT chibi, NOT anime, NOT 3D-rendered, NOT photorealistic photography.`,
    `  • Reference quality: think Square Enix or Riot Games character art card, or a Pixar/Disney concept-art painting refined for an editorial luxury brand.`,
    ``,
    `IDENTITY (from canonical bible — do not deviate):`,
    `  • Visual archetype: ${ctx.visualArchetype}`,
    `  • Silhouette: ${ctx.silhouette}`,
    `  • Wardrobe: ${ctx.wardrobe}`,
    `  • Signature props: ${ctx.props}`,
    `  • Mobile read: ${ctx.mobileRead}`,
  ];
  if (ctx.accent) lines.push(`  • Color accent (lead color in palette): ${ctx.accent}`);
  if (ctx.artDirectionNotes) lines.push(`  • Art direction notes: ${ctx.artDirectionNotes}`);
  lines.push(`  • Match exact face/hair/skin/age/proportions/palette from canon. Vary ONLY styling/wardrobe/pose — never identity.`);
  return lines.join("\n");
}

// Production-slot prompts — one per (outfit, pose) combo. Built from scratch
// so each slot's pose+outfit are the SOLE pose/outfit signal in the prompt —
// previously we injected the full approved-lane concept prompt which contained
// the lane's own pose/stance language and overrode the per-slot pose, making
// all 21 sprites land in roughly the same pose. The lane is now referenced as
// an identity anchor only (face, hair, palette).
export interface BuildProductionSlotPromptsInput {
  characterId: string;
  workspaceRoot: string;
  approvedLaneIndex: number;
  outfits: readonly string[];
  poses: readonly string[];
  bundle?: TowerContextBundle;
}

export interface ProductionSlotPrompt {
  slotId: string;
  outfit: string;
  pose: string;
  prompt: string;
}

export async function buildProductionSlotPrompts(input: BuildProductionSlotPromptsInput): Promise<ProductionSlotPrompt[]> {
  const bundle = input.bundle ?? await loadTowerContext({ workspaceRoot: input.workspaceRoot });
  const ctx = pickCharacterContext(bundle, input.characterId);
  if (!ctx) throw new Error(`prompt-builder: no character context for "${input.characterId}"`);
  const negative = ctx.negativePrompt || ctx.negativeDNA || "no identity drift, fake text, logo, watermark.";
  const identityBlock = buildIdentityAnchorBlock(ctx);
  const styleBlock = buildStyleBlock();
  const slots: ProductionSlotPrompt[] = [];
  for (const outfit of input.outfits) {
    for (const pose of input.poses) {
      const slotId = `${outfit}-${pose}`;
      const prompt = [
        `Create production sprite for ${ctx.displayName}, ${ctx.title} of The Tower — outfit "${outfit}", pose "${pose}".`,
        ``,
        styleBlock,
        ``,
        identityBlock,
        ``,
        `THIS SPRITE`,
        `  • Outfit: ${outfitDefinition(outfit)}.`,
        `  • Pose: ${poseDefinition(pose)}.`,
        `  • Expression: matches pose energy, never neutral if pose is greeting/talking/listening.`,
        ``,
        `IDENTITY ANCHOR — match the exact face, hair, skin tone, body proportions, and accent palette established in the approved concept lane #${input.approvedLaneIndex}. Do not introduce new features, change ethnicity, age the character beyond ±2 years, or shift the palette.`,
        ``,
        `COMPOSITION`,
        `  • Single full-body figure, centered, 9:16 portrait framing.`,
        `  • Solid neutral pastel-cream backdrop (#F4E8D3) with high subject-background separation. NO patterned walls, NO furniture, NO scenery.`,
        `  • Soft ambient occlusion under the feet only — no dramatic cast shadow on the backdrop.`,
        `  • Generous safe padding around the figure for downstream cutout.`,
        ``,
        `AVOID: ${negative}. No flat vector, no cell-shaded cartoon, no corporate-startup illustration, no chibi, no anime, no 3D render, no photography, no environmental background, no text or logos.`,
      ].join("\n");
      slots.push({ slotId, outfit, pose, prompt });
    }
  }
  return slots;
}

function buildIdentityAnchorBlock(ctx: TowerCharacterContext): string {
  const lines = [
    `IDENTITY (locked — match the canonical bible)`,
    `  • Visual archetype: ${ctx.visualArchetype}`,
    `  • Silhouette: ${ctx.silhouette}`,
    `  • Wardrobe base palette: ${ctx.wardrobe}`,
    `  • Signature props: ${ctx.props}`,
  ];
  if (ctx.accent) lines.push(`  • Accent color: ${ctx.accent}`);
  return lines.join("\n");
}

function buildStyleBlock(): string {
  return [
    `STYLE — premium painterly editorial character illustration:`,
    `  • Rich painterly brushwork, dimensional volume, deep saturated colors.`,
    `  • Soft cinematic studio lighting (warm key upper-front, gentle cool fill).`,
    `  • Detailed face anatomy, grounded realistic proportions.`,
    `  • Crisp clean rendering; wardrobe fabric weight + texture visible.`,
    `  • Reference quality: Square Enix / Riot character art card; Pixar concept-art polish.`,
    `  • NOT flat vector, NOT cell-shaded, NOT chibi, NOT anime, NOT 3D-rendered, NOT photographic.`,
  ].join("\n");
}

function outfitDefinition(outfit: string): string {
  switch (outfit) {
    case "regular": return "canonical Tower workplace outfit, full identity wardrobe";
    case "summer-light": return "lighter-layer summer variant of the canonical outfit (same palette, lighter fabrics, no jacket if appropriate)";
    case "winter-layered": return "winter-layered variant of the canonical outfit (same palette, scarf or overcoat added, layered over canon)";
    default: return outfit;
  }
}

function poseDefinition(pose: string): string {
  switch (pose) {
    case "idle": return "neutral standing pose, weight even, hands relaxed, expression composed";
    case "greeting": return "small smile, slight nod, open shoulder, hand raised briefly toward viewer";
    case "listening": return "head tilted slightly, attentive expression, prop lowered, weight forward";
    case "thinking": return "hand near jaw or chin, eyes downcast or middle distance, contemplative";
    case "talking": return "hand gesturing mid-sentence, expressive mouth, engaged eye contact";
    case "alert": return "head turned, raised brow, body subtly tensed, watchful";
    case "working": return "actively using primary prop, focused gaze, body grounded, head tilted toward work";
    default: return pose;
  }
}

// Environment-runner prompts — one per time-of-day slot.
export interface BuildEnvironmentPromptsInput {
  space: string;
  workspaceRoot: string;
  brain: ArtLabLlmBrain;
  slots: readonly string[];
  bundle?: TowerContextBundle;
}

export interface EnvironmentSlotPrompt {
  slotId: string;
  prompt: string;
}

export async function buildEnvironmentPrompts(input: BuildEnvironmentPromptsInput): Promise<{ prompts: EnvironmentSlotPrompt[]; source: "brain" | "canonical" }> {
  const bundle = input.bundle ?? await loadTowerContext({ workspaceRoot: input.workspaceRoot });
  const floor = pickFloorContext(bundle, input.space);
  if (!floor) throw new Error(`prompt-builder: no floor context for "${input.space}"`);
  try {
    const result = await input.brain.decide({
      kind: "generate-environment-prompts",
      input: {
        space: floor.space,
        roomName: floor.roomName,
        floorNumber: floor.floorNumber,
        atmosphere: floor.atmosphere,
        function: floor.function,
        requiredSlots: input.slots,
        styleEnvelope: { id: bundle.styleEnvelope.id, storyTone: bundle.styleEnvelope.storyTone },
      },
    });
    const parsed = parseEnvironmentPromptsOutput(result.outputJson, input.slots);
    if (parsed && parsed.length === input.slots.length) return { prompts: parsed, source: "brain" };
  } catch {
    // brain unavailable — fall through to canonical fallback
  }
  return {
    prompts: input.slots.map((slot) => ({
      slotId: slot,
      prompt: [
        `Create a tower-flat-plus-depth-v1 premium illustrative environment plate.`,
        `Floor: ${floor.roomName} (${floor.floorNumber}) — ${floor.function}.`,
        `Atmosphere: ${floor.atmosphere}.`,
        `Time-of-day: ${slot}.`,
        `No characters in frame. 16:9 framing. No text, logos, signage, copyrighted skyline likenesses.`,
      ].join("\n"),
    })),
    source: "canonical",
  };
}

function parseEnvironmentPromptsOutput(json: unknown, slots: readonly string[]): EnvironmentSlotPrompt[] | null {
  if (!json || typeof json !== "object") return null;
  const arr = (json as { prompts?: unknown }).prompts;
  if (!Array.isArray(arr)) return null;
  const out: EnvironmentSlotPrompt[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const i = item as { slotId?: unknown; prompt?: unknown };
    if (typeof i.slotId !== "string" || typeof i.prompt !== "string") continue;
    if (!slots.includes(i.slotId)) continue;
    out.push({ slotId: i.slotId, prompt: i.prompt });
  }
  return out;
}
