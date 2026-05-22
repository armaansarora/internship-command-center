// src/lib/artlab/contracts/character-contract.ts
//
// The 21-sprite matrix is ArtLab's bedrock contract: every character produces
// a 7-pose × 3-expression matrix so the cast renders consistently across
// floors. All other contracts (animation, environment, ui-texture, prop)
// orbit this one. Production runners that build character assets must
// generate exactly these 21 slots and pass each through the standard QA.

import { z } from "zod";

export const CHARACTER_POSES = [
  "idle",
  "talking",
  "listening",
  "thinking",
  "pointing",
  "celebrating",
  "concerned",
] as const;
export type CharacterPose = (typeof CHARACTER_POSES)[number];

export const CHARACTER_EXPRESSIONS = [
  "neutral",
  "positive",
  "contemplative",
] as const;
export type CharacterExpression = (typeof CHARACTER_EXPRESSIONS)[number];

export const CHARACTER_MATRIX_SLOT_COUNT = CHARACTER_POSES.length * CHARACTER_EXPRESSIONS.length;

export interface CharacterMatrixSlot {
  slotId: `${CharacterPose}-${CharacterExpression}`;
  pose: CharacterPose;
  expression: CharacterExpression;
  required: true;
}

export const CHARACTER_MATRIX: readonly CharacterMatrixSlot[] = CHARACTER_POSES.flatMap((pose) =>
  CHARACTER_EXPRESSIONS.map((expression) => ({
    slotId: `${pose}-${expression}` as const,
    pose,
    expression,
    required: true as const,
  })),
);

export const CharacterMatrixSlotSchema = z
  .object({
    slotId: z.string().regex(/^[a-z]+-[a-z]+$/),
    pose: z.enum(CHARACTER_POSES),
    expression: z.enum(CHARACTER_EXPRESSIONS),
    required: z.literal(true),
  })
  .strict();

export const CharacterPoseManifestEntrySchema = z
  .object({
    slotId: z.string().min(1),
    pose: z.enum(CHARACTER_POSES),
    expression: z.enum(CHARACTER_EXPRESSIONS),
    sourcePath: z.string().min(1),
    transparentPngPath: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    alphaVerified: z.boolean(),
  })
  .strict();
export type CharacterPoseManifestEntry = z.infer<typeof CharacterPoseManifestEntrySchema>;

export const CharacterPoseManifestSchema = z
  .object({
    schemaVersion: z.literal("tower-creative-production.character.v1"),
    characterId: z.string().min(1),
    runId: z.string().min(1),
    promotedAt: z.string().min(1),
    entries: z.array(CharacterPoseManifestEntrySchema).length(CHARACTER_MATRIX_SLOT_COUNT),
  })
  .strict()
  .refine(
    (manifest) => {
      const ids = new Set(manifest.entries.map((entry) => entry.slotId));
      if (ids.size !== CHARACTER_MATRIX_SLOT_COUNT) return false;
      for (const slot of CHARACTER_MATRIX) {
        if (!ids.has(slot.slotId)) return false;
      }
      return true;
    },
    { message: "character pose manifest must contain exactly the 21 (pose × expression) slots with no duplicates" },
  );
export type CharacterPoseManifest = z.infer<typeof CharacterPoseManifestSchema>;

export interface CharacterContract {
  schemaVersion: "tower-creative-production.character.v1";
  matrix: typeof CHARACTER_MATRIX;
  slotCount: typeof CHARACTER_MATRIX_SLOT_COUNT;
  manifestSchema: typeof CharacterPoseManifestSchema;
}

export const characterContract: CharacterContract = {
  schemaVersion: "tower-creative-production.character.v1",
  matrix: CHARACTER_MATRIX,
  slotCount: CHARACTER_MATRIX_SLOT_COUNT,
  manifestSchema: CharacterPoseManifestSchema,
};

export function buildEmptyCharacterPoseManifest(input: {
  characterId: string;
  runId: string;
  promotedAt?: string;
}): Omit<CharacterPoseManifest, "entries"> & { entries: CharacterPoseManifestEntry[] } {
  return {
    schemaVersion: "tower-creative-production.character.v1",
    characterId: input.characterId,
    runId: input.runId,
    promotedAt: input.promotedAt ?? new Date().toISOString(),
    entries: [],
  };
}

export function isCharacterMatrixComplete(slotIds: readonly string[]): boolean {
  const provided = new Set(slotIds);
  if (provided.size !== CHARACTER_MATRIX_SLOT_COUNT) return false;
  for (const slot of CHARACTER_MATRIX) {
    if (!provided.has(slot.slotId)) return false;
  }
  return true;
}
