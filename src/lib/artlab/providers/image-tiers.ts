// src/lib/artlab/providers/image-tiers.ts
//
// Single source of truth for ArtLab's image-generation cost policy.
//
// ArtLab is FREE by default. Every image — concept exploration AND final
// production sprites — runs on Google AI Studio's free tier
// (gemini-2.5-flash-image / "Nano Banana"): ~500 images/day at $0, and
// top-3 globally for character consistency (near-max quality).
//
// Nothing bills unless the operator EXPLICITLY opts into paid generation via
// ARTLAB_ALLOW_PAID_IMAGES=on. This guard is the fix for the "$50 for two
// characters" surprise: a paid image model can never be selected by accident.
// An override pointing at a paid model is silently downgraded to the free
// default unless paid images are explicitly allowed.
//
// MAX QUALITY (opt-in): set
//   ARTLAB_ALLOW_PAID_IMAGES=on
//   ARTLAB_PRODUCTION_IMAGE_MODEL=gemini-3-pro-image-preview
// to render canonical/anchor sprites with Nano Banana Pro — SOTA for
// multi-reference character consistency. At ~$0.134/image this is covered by
// the $10/mo Google Cloud credit bundled with a Google AI Pro subscription
// (via the Google Developer Program), so it stays effectively free.

export type ImageModelTier = "free" | "paid";

/**
 * The zero-cost default for ALL image generation (concept + production).
 * gemini-2.5-flash-image ("Nano Banana") runs on Google AI Studio's free
 * tier and is top-tier for character consistency — near-max quality at $0.
 */
export const FREE_TIER_IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * The premium "max quality" tier — Google's Nano Banana Pro
 * (gemini-3-pro-image-preview), SOTA for multi-reference character
 * consistency. NOT free (~$0.134/image) but covered by the $10/mo Google
 * Cloud credit bundled with a Google AI Pro subscription. Reserved for
 * canonical/anchor renders and ONLY used when paid images are explicitly
 * allowed.
 */
export const MAX_QUALITY_IMAGE_MODEL = "gemini-3-pro-image-preview";

// Models that incur $0 on a free Google AI Studio key. Anything not in this
// set is treated as PAID and gated behind ARTLAB_ALLOW_PAID_IMAGES=on.
const FREE_TIER_MODELS: ReadonlySet<string> = new Set([FREE_TIER_IMAGE_MODEL]);

export function isFreeTierImageModel(model: string): boolean {
  return FREE_TIER_MODELS.has(model);
}

export function imageModelTier(model: string): ImageModelTier {
  return isFreeTierImageModel(model) ? "free" : "paid";
}

export function paidImagesAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ARTLAB_ALLOW_PAID_IMAGES === "on";
}

export interface ImageModelResolution {
  /** The model the runner should actually use. */
  model: string;
  tier: ImageModelTier;
  /** True when a requested PAID model was downgraded to the free default. */
  downgraded: boolean;
  /** What the env/caller originally requested (for telemetry + warnings). */
  requested: string;
}

function resolveImageModel(requested: string, env: NodeJS.ProcessEnv): ImageModelResolution {
  if (isFreeTierImageModel(requested)) {
    return { model: requested, tier: "free", downgraded: false, requested };
  }
  // requested is a paid model
  if (paidImagesAllowed(env)) {
    return { model: requested, tier: "paid", downgraded: false, requested };
  }
  // Paid requested but not allowed → downgrade to the free default so we
  // never bill by accident.
  return { model: FREE_TIER_IMAGE_MODEL, tier: "free", downgraded: true, requested };
}

/**
 * Resolve the concept-tier image model. Free by default; an override via
 * ARTLAB_CONCEPT_IMAGE_MODEL is honoured only when it's free-tier OR paid
 * images are explicitly enabled.
 */
export function resolveConceptImageModel(env: NodeJS.ProcessEnv = process.env): ImageModelResolution {
  const requested = env.ARTLAB_CONCEPT_IMAGE_MODEL ?? FREE_TIER_IMAGE_MODEL;
  return resolveImageModel(requested, env);
}

/**
 * Resolve the production-tier image model. Free by default; opt into Nano
 * Banana Pro via ARTLAB_PRODUCTION_IMAGE_MODEL=gemini-3-pro-image-preview +
 * ARTLAB_ALLOW_PAID_IMAGES=on.
 */
export function resolveProductionImageModel(env: NodeJS.ProcessEnv = process.env): ImageModelResolution {
  const requested = env.ARTLAB_PRODUCTION_IMAGE_MODEL ?? FREE_TIER_IMAGE_MODEL;
  return resolveImageModel(requested, env);
}
