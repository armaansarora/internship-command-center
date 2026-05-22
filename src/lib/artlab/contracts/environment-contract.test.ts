// src/lib/artlab/contracts/environment-contract.test.ts
import { describe, expect, it } from "vitest";
import { ENVIRONMENT_CONTRACT, validateEnvironmentSlotSpec } from "./environment-contract";

describe("environment asset contract", () => {
  it("aspect ratio is 16:9 (background full-bleed); resolution ≥ 4K width", () => {
    expect(ENVIRONMENT_CONTRACT.aspectRatio).toBe("16:9");
    expect(ENVIRONMENT_CONTRACT.minWidth).toBeGreaterThanOrEqual(3840);
  });

  it("requires exactly 4 slot variants (day morning/midday/evening + night)", () => {
    expect(ENVIRONMENT_CONTRACT.requiredSlots).toEqual(["day-morning", "day-midday", "day-evening", "night"]);
  });

  it("validates a well-formed slot spec", () => {
    const spec = { slotId: "war-room-day-midday", floor: "war-room", timeOfDay: "day-midday" as const };
    expect(() => validateEnvironmentSlotSpec(spec)).not.toThrow();
  });

  it("rejects an out-of-vocabulary timeOfDay", () => {
    const spec = { slotId: "x", floor: "war-room", timeOfDay: "twilight" as unknown };
    expect(() => validateEnvironmentSlotSpec(spec)).toThrow();
  });
});
