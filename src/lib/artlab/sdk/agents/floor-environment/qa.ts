import { evaluateArtLabFloorPerceptualCoherence } from "./qa/perceptual-coherence";
import { evaluateArtLabFloorPaletteFit } from "./qa/palette";
import type { ArtLabFloorTimeState } from "./types";

/**
 * Critical 2 fix: the previous "room-elements" gate compared
 * `canon.requiredElements` against a `reportedElements` string set
 * supplied by the caller (CLI or test). It NEVER inspected the actual
 * image — the gate was theatrical and could be trivially satisfied
 * by echoing the canon list back.
 *
 * Honest fix (option b): remove the gate entirely. The report still
 * carries the canonical required-element list under
 * `roomElementsCheck.declaredRequired` with `status: "todo-post-launch"`
 * so downstream consumers and reviewers can see the gap explicitly
 * instead of trusting a placeholder pass. A vision-LLM-backed check is
 * left as future work and tracked at the manifest level.
 */
export type ArtLabFloorQaGate = "palette" | "coherence";

export interface ArtLabFloorQaInput {
  canonPalette: ReadonlyArray<string>;
  requiredElements: ReadonlyArray<string>;
  variants: ReadonlyArray<{
    timeState: ArtLabFloorTimeState;
    bytes: Buffer;
  }>;
}

export interface ArtLabFloorRoomElementsCheck {
  status: "todo-post-launch";
  declaredRequired: ReadonlyArray<string>;
  reason: string;
}

export interface ArtLabFloorQaReport {
  passed: boolean;
  failedGates: ReadonlyArray<ArtLabFloorQaGate>;
  palette: { passed: boolean; distance: number };
  roomElementsCheck: ArtLabFloorRoomElementsCheck;
  coherence: {
    passed: boolean;
    maxHamming: number;
    flaggedTimeStates: ReadonlyArray<ArtLabFloorTimeState>;
  };
}

export async function runArtLabFloorQa(
  input: ArtLabFloorQaInput,
): Promise<ArtLabFloorQaReport> {
  const anchor = input.variants[0]?.bytes;
  if (!anchor) {
    throw new Error("artlab/floor: qa requires at least one variant");
  }
  const palette = await evaluateArtLabFloorPaletteFit(
    anchor,
    input.canonPalette,
  );
  const coherence = await evaluateArtLabFloorPerceptualCoherence(
    input.variants,
  );
  const failedGates: ArtLabFloorQaGate[] = [];
  if (!palette.passed) failedGates.push("palette");
  if (!coherence.passed) failedGates.push("coherence");
  return {
    passed: failedGates.length === 0,
    failedGates,
    palette: { passed: palette.passed, distance: palette.distance },
    roomElementsCheck: {
      status: "todo-post-launch",
      declaredRequired: input.requiredElements,
      reason:
        "no vision-LLM check yet — required elements are declared but not verified against pixels",
    },
    coherence: {
      passed: coherence.passed,
      maxHamming: coherence.maxHamming,
      flaggedTimeStates: coherence.flaggedTimeStates,
    },
  };
}
