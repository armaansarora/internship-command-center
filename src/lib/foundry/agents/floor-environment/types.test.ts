import { describe, expect, it } from "vitest";
import {
  FOUNDRY_FLOOR_TIME_STATES,
  FOUNDRY_FLOOR_LAYER_NAMES,
  FOUNDRY_FLOOR_COMPOSITE_KINDS,
  FoundryFloorEnvironmentInputSchema,
  FoundryFloorLayerManifestSchema,
  FoundryFloorVariantManifestSchema,
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

  it("declares a single composite layer (honest spec)", () => {
    expect(FOUNDRY_FLOOR_LAYER_NAMES).toEqual(["composite"]);
  });

  it("only supports single-composite kind today", () => {
    expect(FOUNDRY_FLOOR_COMPOSITE_KINDS).toEqual(["single-composite"]);
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
      name: "composite",
      path: "composite.png",
      zIndex: 0,
      hasAlpha: false,
    });
    expect(parsed.zIndex).toBe(0);
  });

  it("variant manifest requires kind discriminator and exactly one layer", () => {
    const parsed = FoundryFloorVariantManifestSchema.parse({
      timeState: "dawn",
      kind: "single-composite",
      layers: [
        {
          name: "composite",
          path: "dawn/composite.png",
          zIndex: 0,
          hasAlpha: false,
        },
      ],
      perceptualHash: "0123456789abcdef",
    });
    expect(parsed.kind).toBe("single-composite");
    expect(parsed.layers).toHaveLength(1);
  });

  it("variant manifest rejects more than one layer", () => {
    expect(() =>
      FoundryFloorVariantManifestSchema.parse({
        timeState: "dawn",
        kind: "single-composite",
        layers: [
          {
            name: "composite",
            path: "dawn/composite.png",
            zIndex: 0,
            hasAlpha: false,
          },
          {
            name: "composite",
            path: "dawn/composite-2.png",
            zIndex: 1,
            hasAlpha: true,
          },
        ],
        perceptualHash: "0123456789abcdef",
      }),
    ).toThrow();
  });
});
