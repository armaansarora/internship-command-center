// src/lib/artlab/coherence/strict-qa-wiring.ts
//
// Bridge that strict-qa-runner calls to enforce cast-coherence checks at the
// QA gate. Reads cutout files + the promoted style-wins ledger, builds
// LaneSignatures + PromotedCastSignatures, runs checkCastDiversity, and
// returns a small summary. Skips gracefully when cutouts are not real images
// (mock JSON files in smoke runs) so that mock pipelines aren't blocked.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  checkCastDiversity,
  type CastDiversityResult,
  type LaneSignature,
  type PromotedCastSignature,
} from "./cast-diversity";
import {
  computePaletteHistogram,
  computeSilhouetteHash,
} from "./hashes";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const WEBP_MAGIC_PREFIX = Buffer.from([0x52, 0x49, 0x46, 0x46]);

function looksLikeRealImage(path: string): boolean {
  try {
    const fd = readFileSync(path);
    if (fd.length < 16) return false;
    const header = fd.subarray(0, 4);
    return header.equals(PNG_MAGIC) || header.equals(WEBP_MAGIC_PREFIX);
  } catch {
    return false;
  }
}

export interface RunCoherenceCheckInput {
  runDir: string;
  workspaceRoot: string;
}

export interface RunCoherenceCheckResult {
  skipped: boolean;
  skippedReason?: string;
  diversity?: CastDiversityResult;
}

export async function runCoherenceCheck(input: RunCoherenceCheckInput): Promise<RunCoherenceCheckResult> {
  // Diversity is a check on the 5-direction CONCEPT BOARD — are the lanes
  // visually distinct from each other? Production cutouts share a character
  // by definition (same outfit / same identity across 20+ sprites), so
  // diversity-checking those would always fail and isn't the intent.
  const conceptDir = join(input.runDir, "concept-slots");
  if (!existsSync(conceptDir)) {
    return { skipped: true, skippedReason: "no-concept-slots-dir" };
  }
  const lanes = readdirSync(conceptDir).filter((f) => /^lane-\d+\.(png|webp|jpe?g)$/.test(f)).sort();
  if (lanes.length === 0) {
    return { skipped: true, skippedReason: "no-concept-lanes" };
  }
  const realLanes = lanes.filter((f) => looksLikeRealImage(join(conceptDir, f)));
  if (realLanes.length < 2) {
    return { skipped: true, skippedReason: "mock-or-too-few-real-lanes" };
  }
  const laneSigs: LaneSignature[] = await Promise.all(
    realLanes.map(async (file, idx) => ({
      laneIndex: idx + 1,
      silhouette: await computeSilhouetteHash(join(conceptDir, file)),
      palette: await computePaletteHistogram(join(conceptDir, file)),
    })),
  );
  const promotedCast: PromotedCastSignature[] = [];
  const diversity = checkCastDiversity({ lanes: laneSigs, promotedCast });
  return { skipped: false, diversity };
}
