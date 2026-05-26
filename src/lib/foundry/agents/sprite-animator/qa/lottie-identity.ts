// Critical 3 fix: the Lottie QA path had NO character-identity gate.
// For PNG sprite format it's enforced via evaluateFoundrySpriteIdentityDrift;
// for Lottie the source pack was resolved and its anchorPerceptualHash
// fetched yet never checked. A Lottie could ship arbitrary character art
// (or no character art at all) and pass the validity gate.
//
// Honest fix: parse the Lottie JSON's `assets` array, decode every
// embedded base64 image, compute its perceptual hash, and compare to the
// anchor hash. PASS only if at least one embedded image lands within the
// hamming-bit tolerance. FAIL with an actionable reason that names the
// observed hashes when nothing matches OR when the Lottie carries no
// identity-bearing image assets at all.

import { z } from "zod";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { hammingDistanceHex } from "@/lib/artlab/coherence/identity-drift";

const IDENTITY_BIT_THRESHOLD = 14; // mirrors sprite-format threshold
const PERCEPTUAL_HASH_BITS = 64; // 8×8 greyscale = 64 bits

const LottieAssetSchema = z
  .object({
    id: z.string().min(1).optional(),
    p: z.string().optional(),
    u: z.string().optional(),
    e: z.number().int().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
  })
  .passthrough();

const LottieIdentityDocumentSchema = z
  .object({
    assets: z.array(LottieAssetSchema).optional(),
  })
  .passthrough();

export interface FoundryLottieIdentityInput {
  lottieJson: string;
  anchorPerceptualHash: string;
}

export interface FoundryLottieIdentityReport {
  passed: boolean;
  reason?: string;
  /** Number of image assets that were considered (after filtering decodeable). */
  totalImageAssets: number;
  /** Per-asset distances (closest first). Empty when no decodeable image assets. */
  distances: ReadonlyArray<{ assetId: string; hash: string; hamming: number }>;
  /** Min hamming observed across decoded assets (or `null` if no assets). */
  minHamming: number | null;
  thresholdBits: number;
}

function decodeBase64Png(dataUrlOrPath: string): Buffer | null {
  // Data URL: data:image/png;base64,<payload>
  const match = dataUrlOrPath.match(
    /^data:image\/(?:png|webp|jpeg);base64,(.+)$/i,
  );
  if (!match) return null;
  try {
    return Buffer.from(match[1]!, "base64");
  } catch {
    return null;
  }
}

export async function evaluateFoundryLottieIdentity(
  input: FoundryLottieIdentityInput,
): Promise<FoundryLottieIdentityReport> {
  if (!/^[0-9a-f]{16}$/.test(input.anchorPerceptualHash)) {
    throw new Error(
      `foundry/sprite-animator: anchorPerceptualHash must be 16 hex chars (got ${input.anchorPerceptualHash.length})`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.lottieJson);
  } catch (err) {
    return {
      passed: false,
      reason: `failed to parse lottie JSON for identity check: ${(err as Error).message}`,
      totalImageAssets: 0,
      distances: [],
      minHamming: null,
      thresholdBits: IDENTITY_BIT_THRESHOLD,
    };
  }
  const safe = LottieIdentityDocumentSchema.safeParse(parsed);
  if (!safe.success) {
    return {
      passed: false,
      reason: `lottie JSON failed identity-schema check: ${safe.error.message}`,
      totalImageAssets: 0,
      distances: [],
      minHamming: null,
      thresholdBits: IDENTITY_BIT_THRESHOLD,
    };
  }
  const assets = safe.data.assets ?? [];
  const imageAssets = assets.filter(
    (a) => typeof a.p === "string" && a.p.length > 0,
  );
  if (imageAssets.length === 0) {
    return {
      passed: false,
      reason:
        "lottie carries no identity-bearing image assets — cannot verify character identity against source pack anchor",
      totalImageAssets: 0,
      distances: [],
      minHamming: null,
      thresholdBits: IDENTITY_BIT_THRESHOLD,
    };
  }
  const distances: Array<{ assetId: string; hash: string; hamming: number }> =
    [];
  const skipped: string[] = [];
  for (const asset of imageAssets) {
    const payload = asset.p!;
    const bytes = decodeBase64Png(payload);
    if (!bytes) {
      skipped.push(asset.id ?? "<unnamed>");
      continue;
    }
    const hash = await computePerceptualHash(bytes);
    distances.push({
      assetId: asset.id ?? "<unnamed>",
      hash,
      hamming: hammingDistanceHex(input.anchorPerceptualHash, hash),
    });
  }
  if (distances.length === 0) {
    return {
      passed: false,
      reason: `lottie image assets are not embedded as base64 (${skipped.length} skipped: ${skipped.join(", ")}) — identity cannot be verified without raster bytes`,
      totalImageAssets: imageAssets.length,
      distances: [],
      minHamming: null,
      thresholdBits: IDENTITY_BIT_THRESHOLD,
    };
  }
  distances.sort((a, b) => a.hamming - b.hamming);
  const minHamming = distances[0]!.hamming;
  if (minHamming >= IDENTITY_BIT_THRESHOLD) {
    return {
      passed: false,
      reason: `lottie character identity drift: closest embedded asset ${distances[0]!.assetId} hash=${distances[0]!.hash} is ${minHamming}/${PERCEPTUAL_HASH_BITS} bits from anchor ${input.anchorPerceptualHash} (threshold ${IDENTITY_BIT_THRESHOLD})`,
      totalImageAssets: imageAssets.length,
      distances,
      minHamming,
      thresholdBits: IDENTITY_BIT_THRESHOLD,
    };
  }
  return {
    passed: true,
    totalImageAssets: imageAssets.length,
    distances,
    minHamming,
    thresholdBits: IDENTITY_BIT_THRESHOLD,
  };
}
