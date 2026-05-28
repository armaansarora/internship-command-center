// src/lib/artlab/brainstorm/brief-schema.ts
//
// Shape of brief.json — the design brief the brain composes for the user
// to review before any image is generated. The user can accept the brief
// (→ generating-concepts) or adjust it (→ briefing again, with adjustments
// appended to brief-adjustments.jsonl).

import { z } from "zod";

export const BRIEF_ADJUSTMENT_DIMENSIONS = [
  "palette",
  "age",
  "energy",
  "props",
  "references",
  "freetext",
] as const;
export type BriefAdjustmentDimension = (typeof BRIEF_ADJUSTMENT_DIMENSIONS)[number];

export const BriefAdjustmentOptionSchema = z.object({
  label: z.string().min(1).max(48),
  dimension: z.enum(BRIEF_ADJUSTMENT_DIMENSIONS),
}).strict();
export type BriefAdjustmentOption = z.infer<typeof BriefAdjustmentOptionSchema>;

export const DesignBriefSchema = z.object({
  runId: z.string().min(1),
  characterId: z.string().optional(),
  composedAt: z.string().datetime({ offset: true }),
  iteration: z.number().int().min(0),
  identity: z.string().min(1),
  plannedVariation: z.array(z.string().min(1)).min(1).max(8),
  referenceAnchor: z.string().min(1),
  adjustmentOptions: z.array(BriefAdjustmentOptionSchema).max(8),
  deltaSummary: z.string().optional(),       // only present on iterations > 0
  source: z.enum(["brain", "canonical"]),
  model: z.string().optional(),
}).strict();
export type DesignBrief = z.infer<typeof DesignBriefSchema>;

export const BriefAdjustmentEntrySchema = z.object({
  at: z.string().datetime({ offset: true }),
  dimension: z.enum(BRIEF_ADJUSTMENT_DIMENSIONS),
  chosenOption: z.string().optional(),   // sub-token like "palette-cool" — undefined if free-text only
  freeText: z.string().optional(),
}).strict();
export type BriefAdjustmentEntry = z.infer<typeof BriefAdjustmentEntrySchema>;

// Sub-options shown when the user picks a top-level adjustment dimension.
// The brain produces these in compose-brief output for each adjustment, but
// we also have sensible defaults below so the bot can render immediately.
export const DEFAULT_ADJUSTMENT_SUBOPTIONS: Record<BriefAdjustmentDimension, Array<{ id: string; label: string }>> = {
  palette: [
    { id: "palette-cooler", label: "Cooler — sage / muted" },
    { id: "palette-warmer", label: "Warmer — push toward gold" },
    { id: "palette-saturated", label: "More saturated" },
    { id: "palette-earthier", label: "Earthier — leather notes" },
  ],
  age: [
    { id: "age-younger", label: "Younger interpretation" },
    { id: "age-mature", label: "More mature" },
    { id: "age-spread", label: "Wider age spread across lanes" },
  ],
  energy: [
    { id: "energy-confident", label: "More confident / commanding" },
    { id: "energy-warm", label: "Warmer / more approachable" },
    { id: "energy-reserved", label: "Reserved / focused" },
    { id: "energy-kinetic", label: "Kinetic / active" },
  ],
  props: [
    { id: "props-prominent", label: "Make signature prop more prominent" },
    { id: "props-subtle", label: "Subtler prop use" },
    { id: "props-different", label: "Try a different signature object" },
  ],
  references: [
    { id: "ref-otis", label: "Echo Otis's warmth" },
    { id: "ref-mara", label: "Echo Mara's executive gravity" },
    { id: "ref-cinematic", label: "More cinematic lighting" },
    { id: "ref-editorial", label: "More editorial / fashion-magazine" },
  ],
  freetext: [],
};
