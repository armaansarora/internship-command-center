// src/lib/artlab/sdk/canon/character-schema.ts
import { z } from "zod";
import { ArtLabCanonHeaderSchema, ArtLabCanonKindSchema } from "./types";

export const ARTLAB_CHARACTER_OUTFIT_VARIANTS = ["regular", "summer-light", "winter-layered"] as const;
export type ArtLabCharacterOutfitVariant = (typeof ARTLAB_CHARACTER_OUTFIT_VARIANTS)[number];

export const ARTLAB_CHARACTER_POSE_STATES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "talking",
  "alert",
  "working",
] as const;
export type ArtLabCharacterPoseState = (typeof ARTLAB_CHARACTER_POSE_STATES)[number];

export const ARTLAB_CHARACTER_PROMOTION_STATUSES = [
  "queued",
  "in-flight",
  "promoted",
  "blocked",
] as const;
export type ArtLabCharacterPromotionStatus = (typeof ARTLAB_CHARACTER_PROMOTION_STATUSES)[number];

const CharacterHeaderSchema = ArtLabCanonHeaderSchema.extend({
  kind: z.literal("character"),
});

export const ArtLabCharacterCanonSchema = z
  .object({
    header: CharacterHeaderSchema,
    roleSlug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, { message: "roleSlug must be kebab-case lowercase" }),
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
      .array(z.enum(ARTLAB_CHARACTER_OUTFIT_VARIANTS))
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, { message: "outfitVariants must be unique" }),
    poseStates: z
      .array(z.enum(ARTLAB_CHARACTER_POSE_STATES))
      .length(ARTLAB_CHARACTER_POSE_STATES.length)
      .refine(
        (arr) => ARTLAB_CHARACTER_POSE_STATES.every((p) => arr.includes(p)),
        { message: "poseStates must include all 7 canonical states" },
      ),
    promotionStatus: z.enum(ARTLAB_CHARACTER_PROMOTION_STATUSES),
    paletteRef: z.string().min(1),
    motionProfile: z.string().min(1),
    artDirectionNotes: z.string().min(1),
  })
  .strict();
export type ArtLabCharacterCanon = z.infer<typeof ArtLabCharacterCanonSchema>;

export const ARTLAB_CHARACTER_KIND: z.infer<typeof ArtLabCanonKindSchema> = "character";
