import { describe, expect, it } from "vitest";
import {
  FOUNDRY_FLOOR_TIME_STATES,
  FOUNDRY_FLOOR_LAYER_NAMES,
  FoundryFloorEnvironmentInputSchema,
  FoundryFloorLayerManifestSchema,
} from "./types";

describe("foundry floor-environment types", () => {
  it("declares the 7 time states in canonical order", () => {
    expect(FOUNDRY_FLOOR_TIME_STATES).toEqual([
      "dawn",
      "morning",
      "midday",
      "afternoon",
      "dusk",
      "evening",
      "night",
    ]);
  });

  it("declares the 3 layer names in z-order", () => {
    expect(FOUNDRY_FLOOR_LAYER_NAMES).toEqual([
      "background",
      "midground",
      "ambient",
    ]);
  });

  it("accepts a minimal valid input", () => {
    const parsed = FoundryFloorEnvironmentInputSchema.parse({
      runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
      floorSlug: "war-room",
      requestedBy: "agent",
    });
    expect(parsed.floorSlug).toBe("war-room");
    expect(parsed.timeStates).toEqual(FOUNDRY_FLOOR_TIME_STATES);
  });

  it("rejects unknown floorSlug shape", () => {
    expect(() =>
      FoundryFloorEnvironmentInputSchema.parse({
        runId: "x",
        floorSlug: "Bad Slug",
        requestedBy: "agent",
      }),
    ).toThrow();
  });

  it("layer manifest carries zIndex and alpha flag", () => {
    const parsed = FoundryFloorLayerManifestSchema.parse({
      name: "background",
      path: "background.png",
      zIndex: 0,
      hasAlpha: false,
    });
    expect(parsed.zIndex).toBe(0);
  });
});
