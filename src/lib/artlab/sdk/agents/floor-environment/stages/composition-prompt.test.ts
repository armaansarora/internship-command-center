import { describe, expect, it } from "vitest";
import { buildArtLabFloorCompositionPrompt } from "./composition-prompt";
import type { ArtLabFloorCanonEntry } from "../floor-canon";

const canon: ArtLabFloorCanonEntry = {
  slug: "war-room",
  displayName: "The War Room",
  mood: "tactical-luxury",
  palette: ["#1A1A2E", "#C9A84C"],
  requiredElements: ["wall-mounted-boards", "globe"],
  aspectRatio: "16:9",
  typography: "playfair-display",
};

describe("buildArtLabFloorCompositionPrompt", () => {
  it("includes the floor display name", () => {
    const prompt = buildArtLabFloorCompositionPrompt(canon, "midday");
    expect(prompt).toContain("The War Room");
  });

  it("includes every required element", () => {
    const prompt = buildArtLabFloorCompositionPrompt(canon, "midday");
    for (const el of canon.requiredElements) {
      expect(prompt).toContain(el);
    }
  });

  it("includes the time-state cue", () => {
    const prompt = buildArtLabFloorCompositionPrompt(canon, "dusk");
    expect(prompt.toLowerCase()).toContain("dusk");
  });

  it("declares the no-characters rule (background art only)", () => {
    const prompt = buildArtLabFloorCompositionPrompt(canon, "night");
    expect(prompt.toLowerCase()).toContain("no characters");
  });

  it("declares the aspect ratio", () => {
    const prompt = buildArtLabFloorCompositionPrompt(canon, "morning");
    expect(prompt).toContain("16:9");
  });

  it("is deterministic for the same inputs", () => {
    const a = buildArtLabFloorCompositionPrompt(canon, "morning");
    const b = buildArtLabFloorCompositionPrompt(canon, "morning");
    expect(a).toBe(b);
  });
});
