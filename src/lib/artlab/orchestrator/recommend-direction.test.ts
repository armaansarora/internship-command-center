import { describe, expect, it } from "vitest";
import { recommendDirection } from "./recommend-direction";
import type { ArtLabLlmBrain } from "./llm-brain";
import type { TowerCharacterContext } from "../context/tower-context";

function ctx(): TowerCharacterContext {
  return {
    characterId: "cno",
    displayName: "Sol Navarro",
    firstName: "Sol",
    shortLabel: "CNO",
    title: "Chief Networking Officer",
    space: "rolodex-lounge",
    accent: "#5DAA78",
    visualArchetype: "Warm relationship strategist.",
    silhouette: "Open shoulders.",
    wardrobe: "Soft tailored jacket.",
    props: "Contact cards.",
    mobileRead: "Open stance, contact-card prop.",
    negativeDNA: "No spammy sales posture.",
    artDirectionNotes: "Warm + grounded.",
    conceptBoardPrompt: "concept-board prompt placeholder",
    posePackPromptTemplate: "pose-pack {outfitVariantName} {poseName}",
    negativePrompt: "no identity drift.",
    wound: "Knows the hierarchy of attention.",
    doctrine: "Relationships are infrastructure.",
    flaw: "Avoids confrontation.",
    secretStrength: "Reads rooms perfectly.",
    comedicEngine: "Treats small talk as strategy.",
    visualDNA: "Brass-green palette.",
    forbiddenVisualTraits: "No party-promoter outfit.",
    promptFragments: "open stance + contact card",
    recentStyleWins: [],
    recentRejections: [],
    promotedAssetCount: 0,
  };
}

const lanes = [1, 2, 3, 4, 5].map((idx) => ({
  laneIndex: idx,
  variationAxis: `axis-${idx}`,
  prompt: `lane-${idx} prompt`,
  pngPath: `/tmp/lane-${idx}.png`,
}));

describe("recommendDirection", () => {
  it("uses brain output when it returns a valid recommendedLane", async () => {
    const brain: ArtLabLlmBrain = {
      async decide() {
        return {
          kind: "recommend-direction",
          outputJson: { recommendedLane: 3, reasoning: "Closest to canon Sol." },
          confidence: 0.9, tokensIn: 100, tokensOut: 20, model: "claude-opus-4-7",
        };
      },
    };
    const r = await recommendDirection({ characterId: "cno", characterContext: ctx(), lanes, brain });
    expect(r.laneIndex).toBe(3);
    expect(r.source).toBe("brain");
    expect(r.reasoning).toContain("Closest");
  });

  it("falls back to middle lane when brain returns malformed JSON", async () => {
    const brain: ArtLabLlmBrain = {
      async decide() {
        return {
          kind: "recommend-direction",
          outputJson: { mock: true },
          confidence: 0, tokensIn: 0, tokensOut: 0, model: "mock",
        };
      },
    };
    const r = await recommendDirection({ characterId: "cno", characterContext: ctx(), lanes, brain });
    expect(r.source).toBe("fallback");
    expect(r.laneIndex).toBe(3); // middle of 5
  });

  it("falls back when brain throws", async () => {
    const brain: ArtLabLlmBrain = {
      async decide() { throw new Error("brain down"); },
    };
    const r = await recommendDirection({ characterId: "cno", characterContext: ctx(), lanes, brain });
    expect(r.source).toBe("fallback");
    expect(r.laneIndex).toBeGreaterThanOrEqual(1);
  });

  it("rejects out-of-range lane indices", async () => {
    const brain: ArtLabLlmBrain = {
      async decide() {
        return {
          kind: "recommend-direction",
          outputJson: { recommendedLane: 12, reasoning: "Invalid" },
          confidence: 0, tokensIn: 0, tokensOut: 0, model: "mock",
        };
      },
    };
    const r = await recommendDirection({ characterId: "cno", characterContext: ctx(), lanes, brain });
    expect(r.source).toBe("fallback");
  });

  it("handles empty lanes input safely", async () => {
    const brain: ArtLabLlmBrain = {
      async decide() { throw new Error("never called"); },
    };
    const r = await recommendDirection({ characterId: "cno", characterContext: ctx(), lanes: [], brain });
    expect(r.laneIndex).toBe(1);
  });
});
