// src/lib/artlab/coherence/identity-drift.ts
//
// Informational identity-drift probe: compare each production sprite's
// perceptual hash to the approved concept lane's hash. Sprites diverging
// by more than DRIFT_BIT_THRESHOLD bits are flagged. The probe does NOT
// block the run — it appends an `identityDrift` summary to the production
// critique so the user can see at a glance whether image-conditioning held.
//
// Hamming distance is computed on the hex hash returned by
// computePerceptualHash (8x8 greyscale = 64 bits = 16 hex chars).

import { readFileSync } from "node:fs";
import { computePerceptualHash } from "./hashes";

const DRIFT_BIT_THRESHOLD = 12; // out of 64 — ≥12 bits off the reference reads as visibly different
const HIGH_DRIFT_FRACTION = 0.25; // 25% of sprites drifting → warn

export interface IdentityDriftSpritePath {
  slotId: string;
  pngPath: string;
}

export interface IdentityDriftReport {
  /** Count of sprites that exceeded DRIFT_BIT_THRESHOLD against the reference. */
  driftCount: number;
  /** Total sprites compared. */
  totalCount: number;
  /** Average Hamming distance across all sprites (0-64). */
  avgHamming: number;
  /** Max Hamming distance observed. */
  maxHamming: number;
  /** Slot IDs that drifted, ranked worst first. */
  flaggedSlots: Array<{ slotId: string; hamming: number }>;
  /** true when ≥25% of sprites drifted. */
  highDriftWarning: boolean;
  /** The threshold + fraction used (for transparency). */
  thresholdBits: number;
  highDriftFraction: number;
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) {
    // Tolerate mismatch by truncating to shorter — should never happen in
    // practice since computePerceptualHash returns a fixed-length string.
    const minLen = Math.min(a.length, b.length);
    a = a.slice(0, minLen);
    b = b.slice(0, minLen);
  }
  let bits = 0;
  for (let i = 0; i < a.length; i += 1) {
    let xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (xor > 0) {
      bits += xor & 1;
      xor >>= 1;
    }
  }
  return bits;
}

export async function measureIdentityDrift(
  referencePngPath: string,
  sprites: ReadonlyArray<IdentityDriftSpritePath>,
): Promise<IdentityDriftReport> {
  const referenceHash = await computePerceptualHash(readFileSync(referencePngPath));
  const distances: Array<{ slotId: string; hamming: number }> = [];
  for (const sprite of sprites) {
    try {
      const spriteHash = await computePerceptualHash(readFileSync(sprite.pngPath));
      distances.push({ slotId: sprite.slotId, hamming: hammingDistanceHex(referenceHash, spriteHash) });
    } catch {
      // unreadable sprite — treat as max drift so the warning surfaces
      distances.push({ slotId: sprite.slotId, hamming: 64 });
    }
  }
  if (distances.length === 0) {
    return {
      driftCount: 0,
      totalCount: 0,
      avgHamming: 0,
      maxHamming: 0,
      flaggedSlots: [],
      highDriftWarning: false,
      thresholdBits: DRIFT_BIT_THRESHOLD,
      highDriftFraction: HIGH_DRIFT_FRACTION,
    };
  }
  const flagged = distances
    .filter((d) => d.hamming >= DRIFT_BIT_THRESHOLD)
    .sort((a, b) => b.hamming - a.hamming);
  const sum = distances.reduce((acc, d) => acc + d.hamming, 0);
  const max = distances.reduce((acc, d) => Math.max(acc, d.hamming), 0);
  return {
    driftCount: flagged.length,
    totalCount: distances.length,
    avgHamming: Number((sum / distances.length).toFixed(2)),
    maxHamming: max,
    flaggedSlots: flagged.slice(0, 10),
    highDriftWarning: flagged.length / distances.length >= HIGH_DRIFT_FRACTION,
    thresholdBits: DRIFT_BIT_THRESHOLD,
    highDriftFraction: HIGH_DRIFT_FRACTION,
  };
}
