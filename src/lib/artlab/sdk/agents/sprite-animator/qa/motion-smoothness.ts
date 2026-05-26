import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { hammingDistanceHex } from "@/lib/artlab/coherence/identity-drift";

const ADJACENT_BIT_THRESHOLD = 8;

export interface ArtLabSpriteMotionSmoothnessReport {
  passed: boolean;
  maxAdjacentHamming: number;
  flaggedTransitions: ReadonlyArray<{
    from: number;
    to: number;
    hamming: number;
  }>;
  thresholdBits: number;
}

export async function evaluateArtLabSpriteMotionSmoothness(
  frames: ReadonlyArray<Buffer>,
): Promise<ArtLabSpriteMotionSmoothnessReport> {
  if (frames.length < 2) {
    throw new Error(
      "artlab/sprite: motion-smoothness requires at least two frames",
    );
  }
  const hashes = await Promise.all(
    frames.map(async (bytes) => computePerceptualHash(bytes)),
  );
  const transitions: Array<{ from: number; to: number; hamming: number }> = [];
  let max = 0;
  for (let i = 0; i < hashes.length - 1; i += 1) {
    const a = hashes[i]!;
    const b = hashes[i + 1]!;
    const hamming = hammingDistanceHex(a, b);
    if (hamming > max) max = hamming;
    if (hamming >= ADJACENT_BIT_THRESHOLD) {
      transitions.push({ from: i, to: i + 1, hamming });
    }
  }
  return {
    passed: transitions.length === 0,
    maxAdjacentHamming: max,
    flaggedTransitions: transitions,
    thresholdBits: ADJACENT_BIT_THRESHOLD,
  };
}
