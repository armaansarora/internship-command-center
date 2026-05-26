import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { runArtLabFloorQa } from "./qa";

async function solid(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

async function patternPng(): Promise<Buffer> {
  const left = await sharp({ create: { width: 16, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  return sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } })
    .composite([{ input: left, top: 0, left: 0 }])
    .png().toBuffer();
}

describe("runArtLabFloorQa", () => {
  it("aggregates pass when every sub-gate passes", async () => {
    const base = await solid(26, 26, 46);
    const result = await runArtLabFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board"],
      variants: [
        { timeState: "morning", bytes: base },
        { timeState: "midday", bytes: base },
      ],
    });
    expect(result.passed).toBe(true);
    expect(result.failedGates).toEqual([]);
  });

  it("aggregates fail when palette gate fails", async () => {
    const base = await solid(255, 0, 0);
    const result = await runArtLabFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board"],
      variants: [
        { timeState: "morning", bytes: base },
        { timeState: "midday", bytes: base },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("palette");
  });

  it("aggregates fail when coherence gate fails", async () => {
    const same = await solid(26, 26, 46);
    const drifted = await patternPng();
    const result = await runArtLabFloorQa({
      canonPalette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
      requiredElements: ["board"],
      variants: [
        { timeState: "morning", bytes: same },
        { timeState: "midday", bytes: drifted },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("coherence");
  });

  // Critical 2 fix: the previous "room-elements" gate was theatrical — it
  // compared canon.requiredElements against a `reportedElements` string set
  // supplied by the caller (CLI or test). Nothing inspected the actual image
  // for the elements. We removed it honestly rather than mock it; the
  // report now carries `roomElementsCheck: { status: "todo-post-launch" }`
  // so downstream consumers can see the gap explicitly.
  it("does not expose a room-elements gate (honestly TODO post-launch)", async () => {
    const base = await solid(26, 26, 46);
    const result = await runArtLabFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board", "globe"],
      variants: [{ timeState: "morning", bytes: base }],
    });
    const gates: ReadonlyArray<string> = result.failedGates;
    expect(gates).not.toContain("room-elements");
    expect(result.roomElementsCheck.status).toBe("todo-post-launch");
    expect(result.roomElementsCheck.declaredRequired).toEqual(["board", "globe"]);
  });

  it("does not accept reportedElements (theatrical input gone)", async () => {
    const base = await solid(26, 26, 46);
    await runArtLabFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board"],
      // @ts-expect-error reportedElements field has been removed (Critical 2)
      reportedElements: ["board"],
      variants: [{ timeState: "morning", bytes: base }],
    });
  });
});
