import { describe, expect, it } from "vitest";
import {
  assertCreativeParallelCount,
  createCreativeParallelLaneBrief,
  createCreativeParallelWavePlan,
  createCreativeProductionPacket,
  renderCreativeParallelLanePrompt,
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
    expect(plan.totalLanes).toBe(15);
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
    expect(prompt).toContain("You may write only inside");
    expect(prompt).toContain(lane!.outputRoot);
    expect(prompt).toContain("do not write to public/art");
    expect(prompt).toContain("The parent session owns merge, final review, approval, promotion, and app integration.");
  });

  it("rejects unsafe fan-out counts before creating lane work", () => {
    expect(() => assertCreativeParallelCount("--parallel-agents", 0)).toThrow(/--parallel-agents/);
    expect(() => assertCreativeParallelCount("--parallel-agents", 9)).toThrow(/--parallel-agents/);
    expect(() => assertCreativeParallelCount("--waves", 7)).toThrow(/--waves/);
  });
});
