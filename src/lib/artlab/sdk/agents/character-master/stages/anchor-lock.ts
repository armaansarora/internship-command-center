import { sha256OfBytes } from "@/lib/artlab/sdk/asset-pack";
import type { ConceptLane } from "./concept-board";

export interface AnchorLockUniquenessRow {
  otherLaneIndex: number;
  shaPrefix: string;
}

export interface AnchorLockStageInput {
  lanes: readonly ConceptLane[];
  suggestedAnchorLane: number;
}

export interface AnchorLockStageResult {
  anchorLaneIndex: number;
  anchor: ConceptLane;
  uniquenessReport: readonly AnchorLockUniquenessRow[];
  durationMs: number;
}

export async function runAnchorLockStage(input: AnchorLockStageInput): Promise<AnchorLockStageResult> {
  const start = performance.now();
  const anchor = input.lanes.find((l) => l.laneIndex === input.suggestedAnchorLane);
  if (!anchor) {
    throw new Error(`anchor-lock: suggested lane ${input.suggestedAnchorLane} not found`);
  }
  const uniquenessReport: AnchorLockUniquenessRow[] = [];
  for (const other of input.lanes) {
    if (other.laneIndex === input.suggestedAnchorLane) continue;
    uniquenessReport.push({
      otherLaneIndex: other.laneIndex,
      shaPrefix: sha256OfBytes(other.bytes).slice(0, 12),
    });
  }
  return {
    anchorLaneIndex: anchor.laneIndex,
    anchor,
    uniquenessReport,
    durationMs: Math.round(performance.now() - start),
  };
}
