// src/lib/artlab/orchestrator/decision-schemas.ts
//
// Per-kind Zod schemas for brain outputs. The brain adapter validates the
// parsed JSON against the schema for `req.kind` and attaches a
// `_validationError` field to the outputJson on mismatch — callers still get
// a result (with raw text) so they can fall back, but failures are VISIBLE
// in the decision log instead of silently producing degraded copy.
//
// Schemas use .passthrough() so the brain is free to return extra fields;
// we only validate that the REQUIRED shape is present.

import { z } from "zod";
import type { ArtLabLlmDecisionKind } from "./llm-brain";

const ComposeBriefSchema = z.object({
  identity: z.string().min(1),
  plannedVariation: z.array(z.string().min(1)).min(3).max(7),
  referenceAnchor: z.string().min(1),
  adjustmentOptions: z.array(z.object({
    dimension: z.string().min(1),
    label: z.string().min(1),
  })).optional(),
}).passthrough();

const RefineBriefSchema = ComposeBriefSchema; // same shape

const GenerateConceptPromptsSchema = z.object({
  prompts: z.array(z.object({
    laneIndex: z.number().int().min(1).max(5),
    prompt: z.string().min(20),
    variationAxis: z.string().min(1),
  })).length(5),
}).passthrough();

const RefineConceptPromptsSchema = z.object({
  prompts: z.array(z.object({
    laneIndex: z.number().int().min(1).max(5),
    prompt: z.string().min(20),
    variationAxis: z.string().min(1),
    deltaFromPrior: z.string().optional(),
  })).length(5),
}).passthrough();

const CritiqueConceptBoardSchema = z.object({
  summary: z.string().min(1),
  recommendedLane: z.number().int().min(1).max(5),
  perLane: z.array(z.object({
    laneIndex: z.number().int().min(1).max(5),
    critique: z.string().min(1),
    stars: z.number().optional(),
    fitToBible: z.string().optional(),
  })).length(5),
}).passthrough();

const CritiqueProductionSpritesSchema = z.object({
  overallVerdict: z.enum(["tight", "minor-drift", "major-drift"]),
  summary: z.string().min(1),
  flaggedSprites: z.array(z.object({
    slotId: z.string().min(1),
    issue: z.string().min(1),
    severity: z.enum(["minor", "major"]),
  })),
  approvedSpriteCount: z.number().int().min(0).max(21),
}).passthrough();

const ComposeTriggerAckSchema = z.object({
  text: z.string().min(1).max(400),
}).passthrough();

const ComposePromotionCelebrationSchema = z.object({
  text: z.string().min(1).max(800),
}).passthrough();

const AnswerAskSchema = z.object({
  text: z.string().min(1),
  references: z.array(z.string()).optional(),
}).passthrough();

const GenerateEnvironmentPromptsSchema = z.object({
  prompts: z.array(z.object({
    slotId: z.string().min(1),
    prompt: z.string().min(10),
  })).min(1),
}).passthrough();

const RecommendDirectionSchema = z.object({
  laneIndex: z.number().int().min(1).max(5),
  reasoning: z.string().min(1),
}).passthrough();

const BlockerMessageDraftingSchema = z.object({
  text: z.string().min(1),
}).passthrough();

const ReplyParserFallbackSchema = z.object({
  intent: z.string().min(1),
}).passthrough().or(z.object({ outcome: z.string().min(1) }).passthrough());

// Map every decision kind to its expected schema. Unmapped kinds skip
// validation (return { ok: true } trivially) so adding a new kind doesn't
// require a schema upfront.
const SCHEMAS_BY_KIND: Partial<Record<ArtLabLlmDecisionKind, z.ZodType>> = {
  "compose-brief": ComposeBriefSchema,
  "refine-brief": RefineBriefSchema,
  "generate-concept-prompts": GenerateConceptPromptsSchema,
  "refine-concept-prompts": RefineConceptPromptsSchema,
  "critique-concept-board": CritiqueConceptBoardSchema,
  "critique-production-sprites": CritiqueProductionSpritesSchema,
  "compose-trigger-ack": ComposeTriggerAckSchema,
  "compose-promotion-celebration": ComposePromotionCelebrationSchema,
  "answer-ask": AnswerAskSchema,
  "generate-environment-prompts": GenerateEnvironmentPromptsSchema,
  "recommend-direction": RecommendDirectionSchema,
  "blocker-message-drafting": BlockerMessageDraftingSchema,
  "reply-parser-fallback": ReplyParserFallbackSchema,
};

export interface DecisionValidationResult {
  ok: boolean;
  error?: string;     // human-readable validation issue summary (first issue only)
}

/**
 * Validate a brain output against the per-kind schema. Returns ok=true when
 * the kind has no registered schema (forward-compatible). Returns ok=false +
 * a short error string when the schema fails to parse.
 */
export function validateDecisionOutput(
  kind: ArtLabLlmDecisionKind,
  output: Record<string, unknown>,
): DecisionValidationResult {
  const schema = SCHEMAS_BY_KIND[kind];
  if (!schema) return { ok: true };
  // If the output already carries a parse-error tag, validation is trivially
  // failed but we don't double-flag it.
  if (output._parseError) return { ok: false, error: "raw-text (json-parse-failed upstream)" };
  const result = schema.safeParse(output);
  if (result.success) return { ok: true };
  const issue = result.error.issues[0];
  const path = issue?.path?.join(".") ?? "<root>";
  return { ok: false, error: `${path}: ${issue?.message ?? "invalid"}` };
}
