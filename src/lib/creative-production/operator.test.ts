import { describe, expect, it } from "vitest";
import {
  buildCreativeStudioOrientation,
  createDefaultCreativeStudioState,
} from "./index";

describe("creative studio operator", () => {
  it("summarizes what exists, what is recommended, and what remains", () => {
    const orientation = buildCreativeStudioOrientation();

    expect(orientation.openingQuestion).toBe("What are we adding to The Tower today?");
    expect(orientation.soFar).toContain("Otis Vale character pilot promoted");
    expect(orientation.recommendation).toContain("Mara Voss");
    expect(orientation.remaining).toContain("11 Season 1 character identities");
    expect(orientation.availableAssetTypes).toContain("environment");
    expect(orientation.availableAssetTypes).toContain("animation");
  });

  it("can derive orientation from live art status instead of only static defaults", () => {
    const state = createDefaultCreativeStudioState("2026-05-14T00:00:00.000Z", {
      approvedProductionSprites: 21,
      expectedProductionSprites: 252,
      fullyPromotedCharacters: ["Otis Vale (otis)"],
      nextRecommendedCharacter: {
        characterId: "ceo",
        displayName: "Mara Voss",
        reason: "Mara Voss was already chosen as the next pilot after Otis.",
      },
      runLedgers: [
        {
          characterId: "otis",
          runId: "2026-05-14-otis-pilot",
          warningCounts: {
            "source-long-edge-below-4096": 21,
            "source-upscaled-to-master": 21,
          },
        },
      ],
    });

    expect(state.done).toContain("Otis Vale character pilot promoted");
    expect(state.done).toContain("21/252 approved production sprites");
    expect(state.active).toContain("Mara Voss recommended next by live art status");
    expect(state.knownWarnings).toContain("source-upscaled-to-master x21");
  });
});
