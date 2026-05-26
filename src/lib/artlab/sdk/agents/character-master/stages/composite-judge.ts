import { measureIdentityDrift } from "@/lib/artlab/coherence/identity-drift";
import type { ProcessedSprite } from "./cutout-and-feather";

export interface CompositeJudgeFailure {
  reason: string;
  driftBits: number;
  thresholdBits: number;
  offendingSpriteRef: { outfit: string; pose: string } | null;
  offendingPath: string | null;
}

export type CompositeJudgeStageResult =
  | { ok: true; durationMs: number; avgDriftBits: number }
  | { ok: false; durationMs: number; failure: CompositeJudgeFailure };

export interface CompositeJudgeStageInput {
  anchorPath: string;
  sprites: readonly ProcessedSprite[];
}

const HARD_DRIFT_BITS = 24;
const HIGH_DRIFT_FRACTION = 0.25;

export async function runCompositeJudgeStage(input: CompositeJudgeStageInput): Promise<CompositeJudgeStageResult> {
  const start = performance.now();
  const report = await measureIdentityDrift(
    input.anchorPath,
    input.sprites.map((s) => ({ slotId: `${s.outfit}/${s.pose}`, pngPath: s.pngPath })),
  );
  const hardFail = report.flaggedSlots.find((s) => s.hamming >= HARD_DRIFT_BITS);
  if (hardFail) {
    const offending = input.sprites.find((s) => `${s.outfit}/${s.pose}` === hardFail.slotId);
    return {
      ok: false,
      durationMs: Math.round(performance.now() - start),
      failure: {
        reason: `perceptual hash drift exceeded ${HARD_DRIFT_BITS} bits for slot ${hardFail.slotId} (${hardFail.hamming} bits) — sprite does not match canonical anchor`,
        driftBits: hardFail.hamming,
        thresholdBits: HARD_DRIFT_BITS,
        offendingSpriteRef: offending ? { outfit: offending.outfit, pose: offending.pose } : null,
        offendingPath: offending?.pngPath ?? null,
      },
    };
  }
  if (report.driftCount / Math.max(1, report.totalCount) >= HIGH_DRIFT_FRACTION) {
    return {
      ok: false,
      durationMs: Math.round(performance.now() - start),
      failure: {
        reason: `>=${Math.round(HIGH_DRIFT_FRACTION * 100)}% of sprites drifted vs anchor (${report.driftCount}/${report.totalCount}) — identity cohesion failed`,
        driftBits: report.maxHamming,
        thresholdBits: HARD_DRIFT_BITS,
        offendingSpriteRef: null,
        offendingPath: null,
      },
    };
  }
  return {
    ok: true,
    durationMs: Math.round(performance.now() - start),
    avgDriftBits: report.avgHamming,
  };
}
