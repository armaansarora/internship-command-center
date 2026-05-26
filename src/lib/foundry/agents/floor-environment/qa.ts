import { evaluateFoundryFloorPerceptualCoherence } from "./qa/perceptual-coherence";
import { verifyFoundryFloorRoomElements } from "./qa/room-elements";
import { evaluateFoundryFloorPaletteFit } from "./qa/palette";
import type { FoundryFloorTimeState } from "./types";

export type FoundryFloorQaGate = "palette" | "room-elements" | "coherence";

export interface FoundryFloorQaInput {
  canonPalette: ReadonlyArray<string>;
  requiredElements: ReadonlyArray<string>;
  reportedElements: ReadonlyArray<string>;
  variants: ReadonlyArray<{
    timeState: FoundryFloorTimeState;
    bytes: Buffer;
  }>;
}

export interface FoundryFloorQaReport {
  passed: boolean;
  failedGates: ReadonlyArray<FoundryFloorQaGate>;
  palette: { passed: boolean; distance: number };
  roomElements: { passed: boolean; missing: ReadonlyArray<string> };
  coherence: {
    passed: boolean;
    maxHamming: number;
    flaggedTimeStates: ReadonlyArray<FoundryFloorTimeState>;
  };
}

export async function runFoundryFloorQa(
  input: FoundryFloorQaInput,
): Promise<FoundryFloorQaReport> {
  const anchor = input.variants[0]?.bytes;
  if (!anchor) {
    throw new Error("foundry/floor: qa requires at least one variant");
  }
  const palette = await evaluateFoundryFloorPaletteFit(
    anchor,
    input.canonPalette,
  );
  const roomElements = verifyFoundryFloorRoomElements({
    required: input.requiredElements,
    reported: input.reportedElements,
  });
  const coherence = await evaluateFoundryFloorPerceptualCoherence(
    input.variants,
  );
  const failedGates: FoundryFloorQaGate[] = [];
  if (!palette.passed) failedGates.push("palette");
  if (!roomElements.passed) failedGates.push("room-elements");
  if (!coherence.passed) failedGates.push("coherence");
  return {
    passed: failedGates.length === 0,
    failedGates,
    palette: { passed: palette.passed, distance: palette.distance },
    roomElements: {
      passed: roomElements.passed,
      missing: roomElements.missing,
    },
    coherence: {
      passed: coherence.passed,
      maxHamming: coherence.maxHamming,
      flaggedTimeStates: coherence.flaggedTimeStates,
    },
  };
}
