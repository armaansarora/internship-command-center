import { describe, expect, it } from "vitest";
import { runVariantFanOutStage } from "./variant-fan-out";
import { createMockFoundryImageProvider } from "@/lib/foundry/providers/mock-provider";
import type { ConceptLane } from "./concept-board";

const FAKE_ANCHOR: ConceptLane = {
  laneIndex: 3,
  characterId: "sol-navarro",
  variationAxis: "axis-3",
  prompt: "anchor-prompt",
  bytes: Buffer.from("anchor-bytes"),
  widthPx: 1024,
  heightPx: 1792,
};

describe("variant-fan-out stage", () => {
  it("produces exactly 21 variants (3 outfits × 7 poses)", async () => {
    const provider = createMockFoundryImageProvider();
    const result = await runVariantFanOutStage({
      anchor: FAKE_ANCHOR,
      characterId: "sol-navarro",
      provider,
      outfits: ["regular", "summer-light", "winter-layered"],
      poses: ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"],
      seed: 1,
    });
    expect(result.sprites.length).toBe(21);
  });

  it("each sprite carries its outfit + pose identity", async () => {
    const provider = createMockFoundryImageProvider();
    const result = await runVariantFanOutStage({
      anchor: FAKE_ANCHOR,
      characterId: "sol-navarro",
      provider,
      outfits: ["regular"],
      poses: ["idle", "greeting"],
      seed: 1,
    });
    expect(result.sprites.map((s) => `${s.outfit}/${s.pose}`).sort()).toEqual([
      "regular/greeting",
      "regular/idle",
    ]);
  });

  it("passes the anchor as the reference image for every variant", async () => {
    let referenceSeen = 0;
    const provider = {
      id: "spy",
      async generate(i: { referenceImageBytes?: Buffer }): Promise<{ mode: "mock"; bytes: Buffer; contentType: "image/png"; widthPx: number; heightPx: number; costCents: number; durationMs: number; providerId: string }> {
        if (i.referenceImageBytes && i.referenceImageBytes.equals(FAKE_ANCHOR.bytes)) referenceSeen += 1;
        return { mode: "mock", bytes: Buffer.from("x"), contentType: "image/png", widthPx: 1024, heightPx: 1792, costCents: 0, durationMs: 1, providerId: "spy" };
      },
    } as const;
    await runVariantFanOutStage({
      anchor: FAKE_ANCHOR,
      characterId: "sol-navarro",
      provider,
      outfits: ["regular"],
      poses: ["idle", "greeting"],
      seed: 1,
    });
    expect(referenceSeen).toBe(2);
  });
});
