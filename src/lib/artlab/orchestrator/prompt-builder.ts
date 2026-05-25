// src/lib/artlab/orchestrator/prompt-builder.ts
//
// Turns a Tower context bundle into per-slot Gemini prompts. The brain
// (Claude) authors the prompt VARIATIONS; this module assembles inputs,
// invokes the brain, validates the JSON shape, and falls back to a
// canonical-bible prompt if the brain is unavailable / returns malformed JSON.

import { loadTowerContext, pickCharacterContext, pickFloorContext, type TowerContextBundle, type TowerCharacterContext } from "@/lib/artlab/context/tower-context";
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
  source: "brain" | "canonical-fallback";
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
        recentMemory: {
          winsCount: ctx.recentStyleWins.length,
          rejectionsCount: ctx.recentRejections.length,
        },
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
  return { prompts: canonicalFallbackPrompts(ctx), source: "canonical-fallback", characterContext: ctx };
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
const FALLBACK_AXES = [
  { axis: "stance-confident-front", clause: "Composed front-facing stance, weight even, hands relaxed at sides." },
  { axis: "stance-relaxed-three-quarter", clause: "Three-quarter relaxed lean, weight on back foot, one prop held casually." },
  { axis: "stance-engaged-listening", clause: "Slight forward lean, head tilted, attentive listening posture." },
  { axis: "stance-grounded-working", clause: "Squared grounded stance, primary prop in active use, expressive hands." },
  { axis: "stance-warm-greeting", clause: "Open shoulders, small smile, hand gesturing toward the viewer." },
];

function canonicalFallbackPrompts(ctx: TowerCharacterContext): ConceptLanePrompt[] {
  const base = ctx.conceptBoardPrompt || `Create a tower-flat-plus-depth-v1 premium adult web-game sprite of ${ctx.displayName}, ${ctx.title}. Silhouette: ${ctx.silhouette}. Wardrobe: ${ctx.wardrobe}. Props: ${ctx.props}. Mobile read: ${ctx.mobileRead}.`;
  const negative = ctx.negativePrompt || ctx.negativeDNA || "no celebrity likeness, fake text, logo, watermark, identity drift.";
  return FALLBACK_AXES.map((axis, idx) => ({
    laneIndex: idx + 1,
    prompt: [
      base,
      "",
      `Variation for this concept option: ${axis.clause}`,
      "",
      "premium-simple-backdrop-v1: solid neutral background, high subject-background separation, no patterned walls, no furniture overlap, no same-color clothing-background collision, no touching shadows, full-body framing, generous safe padding.",
      "",
      `Negative: ${negative}`,
    ].join("\n"),
    variationAxis: axis.axis,
  }));
}

// Production-slot prompts — one per (outfit, pose) combo. For tonight we build
// them deterministically from the approved-lane concept prompt + the pose pack
// template; the brain isn't invoked per-slot (would add 21 LLM calls per run).
export interface BuildProductionSlotPromptsInput {
  characterId: string;
  workspaceRoot: string;
  approvedLanePrompt: string;
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
  const template = ctx.posePackPromptTemplate || `Using approved ${ctx.displayName} identity reference, create the {outfitVariantName} {poseName} production sprite.`;
  const negative = ctx.negativePrompt || ctx.negativeDNA || "no identity drift, fake text, logo, watermark.";
  const slots: ProductionSlotPrompt[] = [];
  for (const outfit of input.outfits) {
    for (const pose of input.poses) {
      const slotId = `${outfit}-${pose}`;
      const filled = template
        .replace(/\{outfitVariantName\}/g, outfit)
        .replace(/\{poseName\}/g, pose)
        .replace(/\{outfitVariantDefinition\}/g, outfitDefinition(outfit))
        .replace(/\{poseDefinition\}/g, poseDefinition(pose));
      slots.push({
        slotId,
        outfit,
        pose,
        prompt: [
          filled,
          "",
          `Approved lane direction: ${input.approvedLanePrompt}`,
          "",
          `Negative: ${negative}`,
        ].join("\n"),
      });
    }
  }
  return slots;
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

export async function buildEnvironmentPrompts(input: BuildEnvironmentPromptsInput): Promise<{ prompts: EnvironmentSlotPrompt[]; source: "brain" | "canonical-fallback" }> {
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
    source: "canonical-fallback",
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
