import { describe, expect, it } from "vitest";
import {
  buildCreativeStudioOrientation,
  createDefaultCreativeStudioState,
} from "./index";

describe("creative studio operator", () => {
  it("summarizes what exists, what is recommended, and what remains", () => {
    const orientation = buildCreativeStudioOrientation();

    expect(orientation.openingQuestion).toBe("What are we adding to The Tower today?");
    expect(orientation.soFar).toContain("0/252 approved production sprites");
    expect(orientation.recommendation).toContain("Otis Vale");
    expect(orientation.remaining).toContain("Season 1 outfit, pose, and expression packs");
    expect(orientation.availableAssetTypes).toContain("environment");
    expect(orientation.availableAssetTypes).toContain("animation");
  });

  it("can derive orientation from live art status instead of only static defaults", () => {
    const state = createDefaultCreativeStudioState("2026-05-14T00:00:00.000Z", {
      approvedProductionSprites: 0,
      expectedProductionSprites: 252,
      fullyPromotedCharacters: [],
      nextRecommendedCharacter: {
        characterId: "otis",
        displayName: "Otis Vale",
        reason: "Fresh-start reset is active, so Otis should be generated from scratch.",
      },
      runLedgers: [],
    });

    expect(state.done).toContain("0/252 approved production sprites");
    expect(state.done).toContain("Promoted characters: none");
    expect(state.active).toContain("Otis Vale recommended next by live art status");
    expect(state.active).toContain("Otis Vale production packet is the next strict engine action");
    expect(state.knownWarnings).toEqual([]);
  });
});
