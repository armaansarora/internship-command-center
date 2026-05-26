import { z } from "zod";

const DURATION_TOLERANCE_MS = 35; // ~1 frame of slop at 30fps

const LottieLayerSchema = z
  .object({
    ind: z.number().int().positive(),
    ty: z.number().int(),
    nm: z.string(),
    ip: z.number().int(),
    op: z.number().int(),
    st: z.number().int(),
    parent: z.number().int().positive().optional(),
  })
  .passthrough();

const LottieDocumentSchema = z
  .object({
    v: z.string().min(1),
    fr: z.number().positive(),
    ip: z.number().int(),
    op: z.number().int(),
    w: z.number().positive(),
    h: z.number().positive(),
    layers: z.array(LottieLayerSchema),
  })
  .passthrough();

export interface ArtLabLottieValidityInput {
  expectedDurationMs: number;
}

export interface ArtLabLottieValidityReport {
  passed: boolean;
  reason?: string;
}

export function evaluateArtLabLottieValidity(
  rawJson: string,
  input: ArtLabLottieValidityInput,
): ArtLabLottieValidityReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return {
      passed: false,
      reason: `failed to parse lottie JSON: ${(err as Error).message}`,
    };
  }
  const schema = LottieDocumentSchema.safeParse(parsed);
  if (!schema.success) {
    return {
      passed: false,
      reason: `lottie JSON missing required fields: ${schema.error.message}`,
    };
  }
  const doc = schema.data;
  if (doc.layers.length === 0) {
    return { passed: false, reason: "lottie has no layers" };
  }
  const layerIndices = new Set(doc.layers.map((l) => l.ind));
  for (const layer of doc.layers) {
    if (layer.parent !== undefined && !layerIndices.has(layer.parent)) {
      return {
        passed: false,
        reason: `lottie layer ${layer.ind} parent ref ${layer.parent} does not resolve`,
      };
    }
  }
  const computedDurationMs = ((doc.op - doc.ip) / doc.fr) * 1000;
  if (
    Math.abs(computedDurationMs - input.expectedDurationMs) >
    DURATION_TOLERANCE_MS
  ) {
    return {
      passed: false,
      reason: `lottie duration ${computedDurationMs.toFixed(0)}ms does not match expected ${input.expectedDurationMs}ms`,
    };
  }
  return { passed: true };
}
