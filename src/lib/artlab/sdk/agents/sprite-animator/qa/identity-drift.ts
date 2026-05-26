import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { hammingDistanceHex } from "@/lib/artlab/coherence/identity-drift";

const IDENTITY_BIT_THRESHOLD = 14;

export interface FoundrySpriteIdentityDriftInput {
  anchorBytes: Buffer;
  frames: ReadonlyArray<Buffer>;
}

export interface FoundrySpriteIdentityDriftReport {
  passed: boolean;
  totalFrames: number;
  avgHamming: number;
  maxHamming: number;
  flaggedFrameIndices: ReadonlyArray<number>;
  thresholdBits: number;
}

export async function evaluateFoundrySpriteIdentityDrift(
  input: FoundrySpriteIdentityDriftInput,
): Promise<FoundrySpriteIdentityDriftReport> {
  if (input.frames.length === 0) {
    throw new Error(
      "foundry/sprite: identity-drift requires at least one frame",
    );
  }
  const anchorHash = await computePerceptualHash(input.anchorBytes);
  const distances: Array<{ index: number; hamming: number }> = [];
  for (let i = 0; i < input.frames.length; i += 1) {
    const frameHash = await computePerceptualHash(input.frames[i]!);
    distances.push({
      index: i,
      hamming: hammingDistanceHex(anchorHash, frameHash),
    });
  }
  const flagged = distances
    .filter((d) => d.hamming >= IDENTITY_BIT_THRESHOLD)
    .map((d) => d.index);
  const sum = distances.reduce((acc, d) => acc + d.hamming, 0);
  const max = distances.reduce((acc, d) => Math.max(acc, d.hamming), 0);
  return {
    passed: flagged.length === 0,
    totalFrames: input.frames.length,
    avgHamming: Number((sum / distances.length).toFixed(2)),
    maxHamming: max,
    flaggedFrameIndices: flagged,
    thresholdBits: IDENTITY_BIT_THRESHOLD,
  };
}
