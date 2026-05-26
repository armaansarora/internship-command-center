import { z } from "zod";

export const CHARACTER_MASTER_STAGES = [
  "concept-board",
  "anchor-lock",
  "variant-fan-out",
  "cutout-and-feather",
  "composite-judge",
  "manifest-build",
] as const;
export type CharacterMasterStage = (typeof CHARACTER_MASTER_STAGES)[number];

export const CharacterMasterStageSchema = z.enum(CHARACTER_MASTER_STAGES);

export const CharacterMasterInputSchema = z
  .object({
    characterId: z.string().min(1),
    canonRoot: z.string().min(1),
    workspaceRoot: z.string().min(1),
    providerId: z.string().min(1),
    resumeFromStage: CharacterMasterStageSchema.nullable(),
    seed: z.number().int().optional(),
  })
  .strict();
export type CharacterMasterInput = z.infer<typeof CharacterMasterInputSchema>;

export interface CharacterMasterStageResult<T> {
  stage: CharacterMasterStage;
  durationMs: number;
  output: T;
}

export type CharacterMasterEvent =
  | { kind: "stage-started"; stage: CharacterMasterStage; at: string }
  | { kind: "stage-completed"; stage: CharacterMasterStage; durationMs: number; at: string }
  | { kind: "qa-failure"; stage: CharacterMasterStage; reason: string; offendingPath?: string; at: string }
  | { kind: "pack-emitted"; packDir: string; packId: string; at: string };
