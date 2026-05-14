import { describe, expect, it } from "vitest";
import {
  createCreativeCoordinatorReview,
  createCreativeParallelWavePlan,
  createCreativeProductionPacket,
  dedupeCreativeLaneResults,
  normalizeLaneResult,
  renderCoordinatorReportMarkdown,
  renderCoordinatorReviewBoardHtml,
  scoreCreativeLaneResult,
} from "./index";
import type { CreativeCoordinatorLaneInput } from "./index";

function resultMarkdown(input: {
  idea: string;
  difference: string;
  risk?: string;
}): string {
  return [
    "# Lane Result",
    "## Strongest Idea Or Output",
    input.idea,
    "## What Is Meaningfully Different",
    input.difference,
    "## Files Or Prompts Created",
    "- outputs/source.png",
    "## Quality Risks",
    `- ${input.risk ?? "Needs app preview QA."}`,
    "## Housekeeping Notes",
    "- Kept labeled outputs only.",
    "## Continuous-Improvement Notes",
    "- Add automatic screenshot comparison.",
  ].join("\n\n");
}

function laneInput(index: number, idea?: string): CreativeCoordinatorLaneInput {
  const laneId = `wave-${Math.floor(index / 5) + 1}-agent-${(index % 5) + 1}`;

  return {
    laneId,
    strategyLabel: "Wild Card",
    waveMandateLabel: "Wide Divergence",
    resultMarkdown: resultMarkdown({
      idea: idea ?? `Tower approved premium motion concept ${index}`,
      difference: `This lane uses a distinct silhouette, timing, and app integration path ${index}.`,
    }),
    resultJson: {
      laneId,
      strongestIdea: idea ?? `Tower approved premium motion concept ${index}`,
      uniquenessClaim: `Distinct app-ready candidate ${index}.`,
      outputFiles: [`outputs/source-${index}.png`],
      qualityRisks: ["Needs browser preview."],
      fallbackModel: "gpt-5.5",
      fallbackReason: "",
      promotionBlockers: [],
    },
    outputFiles: [`outputs/source-${index}.png`],
    preflight: {
      ok: true,
      checks: ["resolution", "alpha", "app-preview"],
      warnings: [],
      blockers: [],
      files: [`outputs/source-${index}.png`],
    },
    hasResultJson: true,
    hasPreflight: true,
  };
}

describe("creative production coordinator", () => {
  it("scores lane results with production evidence", () => {
    const score = scoreCreativeLaneResult({
      brief: "Create a Tower lobby motion system",
      strongestIdea: "Tower lobby motion system with approved premium visual canon.",
      uniquenessClaim: "Distinct motion timing and reduced-motion fallback.",
      outputFiles: ["outputs/source.png"],
      preflight: { ok: true, checks: ["resolution", "motion"], warnings: [] },
      validationMissing: [],
      qualityRisks: ["Needs browser inspection."],
      promotionBlockers: [],
    });

    expect(score.totalScore).toBeGreaterThan(80);
    expect(score.qualityEvidence).toBeGreaterThan(10);
  });

  it("creates a blocked review when lanes are incomplete", () => {
    const packet = createCreativeProductionPacket({
      assetType: "animation",
      name: "Lobby Motion",
      runId: "lobby-motion-v2",
      brief: "Create a Tower lobby motion system.",
      stateRoot: ".artlab/studio",
    });
    const plan = createCreativeParallelWavePlan({ packet, agentsPerWave: 5, waves: 3 });
    const review = createCreativeCoordinatorReview({
      plan,
      lanes: [laneInput(0), laneInput(1)],
    });

    expect(review.completedLaneCount).toBe(2);
    expect(review.promotionGate.status).toBe("blocked");
    expect(review.promotionGate.blockers.join(" ")).toContain("expected 15 lanes");
  });

  it("dedupes highly similar lane ideas and ranks winners", () => {
    const first = normalizeLaneResult(laneInput(0, "Tower premium lobby motion concept with golden elevator shimmer."), "Tower lobby");
    const duplicate = normalizeLaneResult(laneInput(1, "Tower premium lobby motion concept with golden elevator shimmer."), "Tower lobby");
    const different = normalizeLaneResult(laneInput(2, "Mobile-first reduced-motion arrival card with crisp UI states."), "Tower lobby");
    const groups = dedupeCreativeLaneResults([first, duplicate, different]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.laneIds).toEqual(["wave-1-agent-1", "wave-1-agent-2"]);
  });

  it("renders review artifacts when all 15 lanes are complete", () => {
    const packet = createCreativeProductionPacket({
      assetType: "scene",
      name: "Elevator Arrival",
      runId: "elevator-arrival-v2",
      brief: "Create a Three.js elevator arrival scene with shader atmosphere.",
      stateRoot: ".artlab/studio",
      intake: {
        rawRequest: "Create a Three.js elevator arrival scene with shader atmosphere.",
        inferredAssetType: "scene",
        routingReason: "Matched scene, Three.js, and shader language.",
        confidence: "high",
        matchedSignals: ["scene", "three", "shader"],
        initialApprovalStatus: "already-approved",
      },
    });
    const plan = createCreativeParallelWavePlan({ packet, agentsPerWave: 5, waves: 3 });
    const review = createCreativeCoordinatorReview({
      plan,
      lanes: Array.from({ length: 15 }, (_, index) => laneInput(index)),
    });
    const report = renderCoordinatorReportMarkdown(review);
    const html = renderCoordinatorReviewBoardHtml(review);

    expect(review.completedLaneCount).toBe(15);
    expect(review.promotionGate.status).toBe("ready-for-final-approval");
    expect(review.topCandidates.length).toBeGreaterThan(0);
    expect(report).toContain("Creative Production Coordinator Report");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Review Board");
  });
});
