import { describe, expect, it } from "vitest";
import {
  assertCreativeParallelCount,
  assertCreativeParallelShape,
  CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE,
  CREATIVE_PARALLEL_DEFAULT_TOTAL_LANES,
  createCreativeParallelLaneBrief,
  createCreativeParallelWavePlan,
  createCreativeProductionPacket,
  renderCreativeParallelLanePrompt,
  validateCreativeParallelLaneResult,
} from "./index";

describe("creative production parallel waves", () => {
  it("creates 5x3 isolated lane packets with divergent strategies", () => {
    const packet = createCreativeProductionPacket({
      assetType: "character",
      name: "Otis",
      runId: "otis-parallel-v1",
      brief: "Redo Otis with the same approved design and a wider option spread.",
      stateRoot: ".artlab/studio",
    });
    const plan = createCreativeParallelWavePlan({
      packet,
      agentsPerWave: 5,
      waves: 3,
    });

    expect(plan.agentsPerWave).toBe(5);
    expect(plan.waves).toBe(3);
    expect(plan.totalLanes).toBe(CREATIVE_PARALLEL_DEFAULT_TOTAL_LANES);
    expect(plan.status).toBe("awaiting-initial-approval");
    expect(plan.statusReason).toContain("Initial direction approval");
    expect(plan.defaultAgentProfile).toEqual(CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE);
    expect(plan.laneContract.ownsWriteAccessOnlyInsideLane).toBe(true);
    expect(plan.laneContract.parentOwnsMergeReviewPromotion).toBe(true);

    const laneIds = new Set(plan.lanes.map((lane) => lane.laneId));
    const laneRoots = new Set(plan.lanes.map((lane) => lane.outputRoot));
    const strategies = new Set(plan.lanes.map((lane) => lane.strategy.id));

    expect(laneIds.size).toBe(15);
    expect(laneRoots.size).toBe(15);
    expect(strategies.size).toBe(15);
    expect([...laneRoots].every((root) => root.includes(".artlab/studio/characters/otis-parallel-v1/parallel/lanes/"))).toBe(true);
    expect(plan.lanes.every((lane) => lane.forbiddenActions.some((action) => action.includes("public/art")))).toBe(true);
    expect(plan.lanes.every((lane) => lane.recommendedAgentProfile.model === "gpt-5.5")).toBe(true);
    expect(plan.safetyRules).toContain("15x output may increase variety, never lower the source-quality, QA, approval, or organization bar");
  });

  it("renders lane prompts that give subagents strict write scope and coordinator-only promotion", () => {
    const packet = createCreativeProductionPacket({
      assetType: "environment",
      name: "War Room Background",
      runId: "war-room-background-parallel-v1",
      brief: "Create a bolder war room background option set.",
      stateRoot: ".artlab/studio",
    });
    const plan = createCreativeParallelWavePlan({
      packet,
      agentsPerWave: 2,
      waves: 2,
    });
    const lane = plan.lanes[0];

    expect(lane).toBeDefined();

    const laneBrief = createCreativeParallelLaneBrief(plan, lane!);
    const prompt = renderCreativeParallelLanePrompt(plan, lane!);

    expect(laneBrief.schemaVersion).toBe("tower-creative-parallel-lane-brief-v1");
    expect(laneBrief.parentOwnsMergeReviewPromotion).toBe(true);
    expect(laneBrief.recommendedAgentProfile.reasoningEffort).toBe("xhigh");
    expect(prompt).toContain("You may write only inside");
    expect(prompt).toContain("GPT-5.5 fast mode, extra-high reasoning");
    expect(prompt).toContain("model: \"gpt-5.5\"");
    expect(prompt).toContain("reasoning_effort: \"xhigh\"");
    expect(prompt).toContain(lane!.outputRoot);
    expect(prompt).toContain("do not write to public/art");
    expect(prompt).toContain("The parent session owns merge, final review, approval, promotion, and app integration.");
  });

  it("rejects unsafe fan-out counts before creating lane work", () => {
    expect(() => assertCreativeParallelCount("--parallel-agents", 0)).toThrow(/--parallel-agents/);
    expect(() => assertCreativeParallelCount("--parallel-agents", 9)).toThrow(/--parallel-agents/);
    expect(() => assertCreativeParallelCount("--waves", 7)).toThrow(/--waves/);
    expect(() => assertCreativeParallelShape(8, 6)).toThrow(/capped at 15 lanes/);
  });

  it("marks already-approved production packets as ready for dispatch", () => {
    const packet = createCreativeProductionPacket({
      assetType: "character",
      name: "Otis",
      runId: "otis-approved-parallel-v1",
      brief: "Redo Otis with the same approved design.",
      stateRoot: ".artlab/studio",
      intake: {
        rawRequest: "Redo Otis with the same approved design.",
        inferredAssetType: "character",
        routingReason: "Matched Otis and approved design language.",
        confidence: "high",
        matchedSignals: ["Otis", "approved"],
        initialApprovalStatus: "already-approved",
      },
    });
    const plan = createCreativeParallelWavePlan({
      packet,
      agentsPerWave: 5,
      waves: 3,
    });

    expect(plan.status).toBe("ready-for-dispatch");
    expect(plan.statusReason).toContain("already approved");
  });

  it("rejects incomplete lane results before coordinator merge", () => {
    expect(validateCreativeParallelLaneResult({
      resultMarkdown: "# wave-01-agent-01 Result\n\n## Strongest Idea Or Output\n\nTBD",
      imageOutputCount: 1,
      hasPreflight: false,
    })).toEqual({
      ok: false,
      missing: [
        "## What Is Meaningfully Different",
        "## Files Or Prompts Created",
        "## Quality Risks",
        "## Housekeeping Notes",
        "## Continuous-Improvement Notes",
        "resolved non-placeholder content",
        "preflight.json for image outputs",
      ],
    });

    expect(validateCreativeParallelLaneResult({
      resultMarkdown: [
        "# wave-01-agent-01 Result",
        "## Strongest Idea Or Output",
        "A useful direction.",
        "## What Is Meaningfully Different",
        "The silhouette is softer.",
        "## Files Or Prompts Created",
        "- outputs/source.png",
        "## Quality Risks",
        "- Needs crop QA.",
        "## Housekeeping Notes",
        "- Kept outputs/source.png.",
        "## Continuous-Improvement Notes",
        "- Add faster crop inspection.",
      ].join("\n\n"),
      imageOutputCount: 1,
      hasPreflight: true,
    })).toEqual({
      ok: true,
      missing: [],
    });
  });
});
