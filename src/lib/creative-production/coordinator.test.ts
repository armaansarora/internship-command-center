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
    const plan = createCreativeParallelWavePlan({ packet, agentsPerWave: 5, waves: 1 });
    const review = createCreativeCoordinatorReview({
      plan,
      lanes: [laneInput(0), laneInput(1)],
    });

    expect(review.completedLaneCount).toBe(2);
    expect(review.promotionGate.status).toBe("blocked");
    expect(review.promotionGate.blockers.join(" ")).toContain("expected 5 lanes");
  });

  it("dedupes highly similar lane ideas and ranks winners", () => {
    const first = normalizeLaneResult(laneInput(0, "Tower premium lobby motion concept with golden elevator shimmer."), "Tower lobby");
    const duplicate = normalizeLaneResult(laneInput(1, "Tower premium lobby motion concept with golden elevator shimmer."), "Tower lobby");
    const different = normalizeLaneResult(laneInput(2, "Mobile-first reduced-motion arrival card with crisp UI states."), "Tower lobby");
    const groups = dedupeCreativeLaneResults([first, duplicate, different]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.laneIds).toEqual(["wave-1-agent-1", "wave-1-agent-2"]);
  });

  it("renders review artifacts when all five lanes are complete", () => {
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
    const plan = createCreativeParallelWavePlan({ packet, agentsPerWave: 5, waves: 1 });
    const review = createCreativeCoordinatorReview({
      plan,
      lanes: Array.from({ length: 5 }, (_, index) => laneInput(index)),
    });
    const report = renderCoordinatorReportMarkdown(review);
    const html = renderCoordinatorReviewBoardHtml(review);

    expect(review.completedLaneCount).toBe(5);
    expect(review.promotionGate.status).toBe("ready-for-final-approval");
    expect(review.topCandidates.length).toBeGreaterThan(0);
    expect(report).toContain("Creative Production Coordinator Report");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Review Board");
  });

  it("blocks final approval when lanes do not produce concrete artifacts", () => {
    const packet = createCreativeProductionPacket({
      assetType: "character",
      name: "Otis",
      runId: "otis-no-artifacts-v1",
      brief: "Redo Otis with the same approved design and generate production source options.",
      stateRoot: ".artlab/studio",
      intake: {
        rawRequest: "Redo Otis with the same approved design and generate production source options.",
        inferredAssetType: "character",
        routingReason: "Matched Otis and approved design language.",
        confidence: "high",
        matchedSignals: ["Otis", "approved"],
        initialApprovalStatus: "already-approved",
      },
    });
    const plan = createCreativeParallelWavePlan({ packet, agentsPerWave: 5, waves: 1 });
    const lanes = Array.from({ length: 5 }, (_, index): CreativeCoordinatorLaneInput => {
      const lane = laneInput(index);

      return {
        ...lane,
        resultJson: {
          ...lane.resultJson,
          outputFiles: [],
        },
        outputFiles: [],
        preflight: undefined,
        hasPreflight: false,
      };
    });
    const review = createCreativeCoordinatorReview({ plan, lanes });

    expect(review.completedLaneCount).toBe(0);
    expect(review.promotionGate.status).toBe("blocked");
    expect(review.promotionGate.blockers.join(" ")).toContain("no concrete output artifacts");
  });

  it("does not require image preflight for non-image lane artifacts", () => {
    const lane = normalizeLaneResult({
      laneId: "wave-01-agent-01",
      strategyLabel: "Canonical Safe",
      waveMandateLabel: "Wide Divergence",
      resultMarkdown: resultMarkdown({
        idea: "Tower approved Otis GPT Image 2 prompt packet.",
        difference: "Creates a concrete prompt artifact instead of a source image.",
      }),
      resultJson: {
        laneId: "wave-01-agent-01",
        strongestIdea: "Tower approved Otis GPT Image 2 prompt packet.",
        uniquenessClaim: "Creates a concrete prompt artifact instead of a source image.",
        outputFiles: ["outputs/prompt-packet.md"],
        qualityRisks: ["Still needs actual source image generation."],
        fallbackModel: "gpt-5.5",
        fallbackReason: "",
        promotionBlockers: ["No native 4K source images exist from this lane."],
      },
      outputFiles: ["outputs/prompt-packet.md"],
      hasResultJson: true,
      hasPreflight: false,
    }, "Redo Otis with the same approved design.");

    expect(lane.validationMissing).not.toContain("preflight.json for image outputs");
    expect(lane.promotionBlockers).toContain("No native 4K source images exist from this lane.");
  });

  it("ranks complete prompt lanes even when promotion remains blocked", () => {
    const packet = createCreativeProductionPacket({
      assetType: "character",
      name: "Otis",
      runId: "otis-prompt-review-v1",
      brief: "Redo Otis with the same approved design and create prompt packets.",
      stateRoot: ".artlab/studio",
      intake: {
        rawRequest: "Redo Otis with the same approved design and create prompt packets.",
        inferredAssetType: "character",
        routingReason: "Matched Otis and approved design language.",
        confidence: "high",
        matchedSignals: ["Otis", "approved"],
        initialApprovalStatus: "already-approved",
      },
    });
    const plan = createCreativeParallelWavePlan({ packet, agentsPerWave: 5, waves: 1 });
    const lanes = Array.from({ length: 5 }, (_, index): CreativeCoordinatorLaneInput => {
      const lane = laneInput(index, `Tower approved Otis prompt packet ${index}`);

      return {
        ...lane,
        resultJson: {
          ...lane.resultJson,
          outputFiles: [`outputs/prompt-${index}.md`],
          promotionBlockers: ["No native image sources yet."],
        },
        outputFiles: [`outputs/prompt-${index}.md`],
        preflight: undefined,
        hasPreflight: false,
      };
    });
    const review = createCreativeCoordinatorReview({ plan, lanes });

    expect(review.completedLaneCount).toBe(5);
    expect(review.blockedLaneCount).toBe(0);
    expect(review.topCandidates.length).toBeGreaterThan(0);
    expect(review.promotionGate.status).toBe("blocked");
    expect(review.promotionGate.blockers.join(" ")).toContain("No native image sources yet.");
  });
});
