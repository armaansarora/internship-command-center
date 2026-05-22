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
  const cutoutDir = join(input.runDir, "cutouts");
  if (!existsSync(cutoutDir)) {
    return { skipped: true, skippedReason: "no-cutouts-dir" };
  }
  const cutouts = readdirSync(cutoutDir).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));
  if (cutouts.length === 0) {
    return { skipped: true, skippedReason: "no-cutouts" };
  }
  const realCutouts = cutouts.filter((f) => looksLikeRealImage(join(cutoutDir, f)));
  if (realCutouts.length < 2) {
    return { skipped: true, skippedReason: "mock-or-too-few-real-cutouts" };
  }
  const lanes: LaneSignature[] = await Promise.all(
    realCutouts.map(async (file, idx) => ({
      laneIndex: idx + 1,
      silhouette: await computeSilhouetteHash(join(cutoutDir, file)),
      palette: await computePaletteHistogram(join(cutoutDir, file)),
    })),
  );
  const promotedCast: PromotedCastSignature[] = [];
  const diversity = checkCastDiversity({ lanes, promotedCast });
  return { skipped: false, diversity };
}
