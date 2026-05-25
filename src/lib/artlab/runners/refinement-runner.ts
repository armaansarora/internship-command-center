// src/lib/artlab/runners/refinement-runner.ts
//
// Regenerates 5 concept-board lanes based on accumulated user feedback.
// Reads concept-feedback.jsonl (positive + negative multi-select tokens +
// optional free-text), asks the brain to rewrite the 5 prompts incorporating
// the feedback, then re-runs the image generation against the cheap-tier
// model (same as concept-runner). Auto-advances state back to concept-review
// once the new lanes are ready.
//
// For the MVP, refinement piggybacks on conceptRunner — it simply re-runs
// the concept-runner with the feedback file present. The concept-runner's
// brain call to `refine-concept-prompts` (instead of `generate-concept-
// prompts`) gets triggered when concept-feedback.jsonl has entries.

import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";
import { conceptRunner } from "./concept-runner";

export const refinementRunner: ArtLabRunner = {
  kind: "refinement",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    // Delegate to concept-runner, which now checks for concept-feedback.jsonl
    // and calls refine-concept-prompts when present.
    const result = await conceptRunner.run(input);
    return {
      ...result,
      runnerKind: "refinement",
      artifacts: { ...result.artifacts, refinementRound: true },
    };
  },
};
