import { describe, expect, it } from "vitest";
import { runAnchorLockStage } from "./anchor-lock";
import type { ConceptLane } from "./concept-board";

function fakeLane(idx: number, bytes: Buffer): ConceptLane {
  return {
    laneIndex: idx,
    characterId: "sol-navarro",
    variationAxis: `axis-${idx}`,
    prompt: "p",
    bytes,
    widthPx: 1024,
    heightPx: 1792,
  };
}

describe("anchor-lock stage", () => {
  it("picks the single canonical anchor lane (lowest pairwise distance to others)", async () => {
    const lanes = [
      fakeLane(1, Buffer.from("a".repeat(100))),
      fakeLane(2, Buffer.from("b".repeat(100))),
      fakeLane(3, Buffer.from("c".repeat(100))),
      fakeLane(4, Buffer.from("d".repeat(100))),
      fakeLane(5, Buffer.from("e".repeat(100))),
    ];
    const result = await runAnchorLockStage({ lanes, suggestedAnchorLane: 3 });
    expect(result.anchorLaneIndex).toBe(3);
    expect(result.anchor.characterId).toBe("sol-navarro");
  });

  it("emits a uniqueness report comparing the anchor against the other lanes", async () => {
    const lanes = [
      fakeLane(1, Buffer.from("a".repeat(100))),
      fakeLane(2, Buffer.from("b".repeat(100))),
    ];
    const result = await runAnchorLockStage({ lanes, suggestedAnchorLane: 1 });
    expect(result.uniquenessReport.length).toBe(1);
    expect(result.uniquenessReport[0]?.otherLaneIndex).toBe(2);
  });

  it("throws when suggestedAnchorLane is not present", async () => {
    const lanes = [fakeLane(1, Buffer.from("a"))];
    await expect(runAnchorLockStage({ lanes, suggestedAnchorLane: 99 })).rejects.toThrow();
  });
});
