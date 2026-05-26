// src/lib/foundry/canon/character-schema.ts
import { z } from "zod";
import { FoundryCanonHeaderSchema, FoundryCanonKindSchema } from "./types";

export const FOUNDRY_CHARACTER_OUTFIT_VARIANTS = ["regular", "summer-light", "winter-layered"] as const;
export type FoundryCharacterOutfitVariant = (typeof FOUNDRY_CHARACTER_OUTFIT_VARIANTS)[number];

export const FOUNDRY_CHARACTER_POSE_STATES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "talking",
  "alert",
  "working",
] as const;
export type FoundryCharacterPoseState = (typeof FOUNDRY_CHARACTER_POSE_STATES)[number];

export const FOUNDRY_CHARACTER_PROMOTION_STATUSES = [
  "queued",
  "in-flight",
  "promoted",
  "blocked",
] as const;
export type FoundryCharacterPromotionStatus = (typeof FOUNDRY_CHARACTER_PROMOTION_STATUSES)[number];

const CharacterHeaderSchema = FoundryCanonHeaderSchema.extend({
  kind: z.literal("character"),
});

export const FoundryCharacterCanonSchema = z
  .object({
    header: CharacterHeaderSchema,
    displayName: z.string().min(1),
    shortLabel: z.string().min(1),
    title: z.string().min(1),
    floorId: z.string().min(1),
    floorLabel: z.string().min(1),
    styleEnvelope: z.literal("tower-flat-plus-depth-v1"),
    visualArchetype: z.string().min(1),
    silhouette: z.string().min(1),
    wardrobe: z.string().min(1),
    props: z.array(z.string().min(1)).min(1),
    mobileRead: z.string().min(1),
    negativeDNA: z.string().min(1),
    accent: z.string().min(1),
    doctrine: z.string().min(1),
    flaw: z.string().min(1),
    secretStrength: z.string().min(1),
    wound: z.string().min(1),
    outfitVariants: z
      .array(z.enum(FOUNDRY_CHARACTER_OUTFIT_VARIANTS))
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, { message: "outfitVariants must be unique" }),
    poseStates: z
      .array(z.enum(FOUNDRY_CHARACTER_POSE_STATES))
      .length(FOUNDRY_CHARACTER_POSE_STATES.length)
      .refine(
        (arr) => FOUNDRY_CHARACTER_POSE_STATES.every((p) => arr.includes(p)),
        { message: "poseStates must include all 7 canonical states" },
      ),
    promotionStatus: z.enum(FOUNDRY_CHARACTER_PROMOTION_STATUSES),
    paletteRef: z.string().min(1),
    motionProfile: z.string().min(1),
    artDirectionNotes: z.string().min(1),
  })
  .strict();
export type FoundryCharacterCanon = z.infer<typeof FoundryCharacterCanonSchema>;

export const FOUNDRY_CHARACTER_KIND: z.infer<typeof FoundryCanonKindSchema> = "character";
