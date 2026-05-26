import {
  computePerceptualHash,
} from "@/lib/artlab/coherence/hashes";
import { hammingDistanceHex } from "@/lib/artlab/coherence/identity-drift";
import type { FoundryFloorTimeState } from "../types";

const COHERENCE_BIT_THRESHOLD = 18;

export interface FoundryFloorVariantBytes {
  timeState: FoundryFloorTimeState;
  bytes: Buffer;
}

export interface FoundryFloorCoherenceReport {
  passed: boolean;
  totalCount: number;
  maxHamming: number;
  avgHamming: number;
  flaggedTimeStates: ReadonlyArray<FoundryFloorTimeState>;
  thresholdBits: number;
}

export async function evaluateFoundryFloorPerceptualCoherence(
  variants: ReadonlyArray<FoundryFloorVariantBytes>,
): Promise<FoundryFloorCoherenceReport> {
  if (variants.length < 2) {
    return {
      passed: true,
      totalCount: variants.length,
      maxHamming: 0,
      avgHamming: 0,
      flaggedTimeStates: [],
      thresholdBits: COHERENCE_BIT_THRESHOLD,
    };
  }
  const hashes = await Promise.all(
    variants.map(async (v) => ({
      timeState: v.timeState,
      hash: await computePerceptualHash(v.bytes),
    })),
  );
  const anchor = hashes[0]!;
  const distances = hashes.slice(1).map((h) => ({
    timeState: h.timeState,
    hamming: hammingDistanceHex(anchor.hash, h.hash),
  }));
  const flagged = distances
    .filter((d) => d.hamming >= COHERENCE_BIT_THRESHOLD)
    .map((d) => d.timeState);
  const max = distances.reduce((acc, d) => Math.max(acc, d.hamming), 0);
  const avg =
    distances.reduce((acc, d) => acc + d.hamming, 0) /
    Math.max(distances.length, 1);
  return {
    passed: flagged.length === 0,
    totalCount: variants.length,
    maxHamming: max,
    avgHamming: Number(avg.toFixed(2)),
    flaggedTimeStates: flagged,
    thresholdBits: COHERENCE_BIT_THRESHOLD,
  };
}
