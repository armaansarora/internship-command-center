import { describe, expect, it } from "vitest";
import { buildFoundryFloorCompositionPrompt } from "./composition-prompt";
import type { FoundryFloorCanonEntry } from "../floor-canon";

const canon: FoundryFloorCanonEntry = {
  slug: "war-room",
  displayName: "The War Room",
  mood: "tactical-luxury",
  palette: ["#1A1A2E", "#C9A84C"],
  requiredElements: ["wall-mounted-boards", "globe"],
  aspectRatio: "16:9",
  typography: "playfair-display",
};

describe("buildFoundryFloorCompositionPrompt", () => {
  it("includes the floor display name", () => {
    const prompt = buildFoundryFloorCompositionPrompt(canon, "midday");
    expect(prompt).toContain("The War Room");
  });

  it("includes every required element", () => {
    const prompt = buildFoundryFloorCompositionPrompt(canon, "midday");
    for (const el of canon.requiredElements) {
      expect(prompt).toContain(el);
    }
  });

  it("includes the time-state cue", () => {
    const prompt = buildFoundryFloorCompositionPrompt(canon, "dusk");
    expect(prompt.toLowerCase()).toContain("dusk");
  });

  it("declares the no-characters rule (background art only)", () => {
    const prompt = buildFoundryFloorCompositionPrompt(canon, "night");
    expect(prompt.toLowerCase()).toContain("no characters");
  });

  it("declares the aspect ratio", () => {
    const prompt = buildFoundryFloorCompositionPrompt(canon, "morning");
    expect(prompt).toContain("16:9");
  });

  it("is deterministic for the same inputs", () => {
    const a = buildFoundryFloorCompositionPrompt(canon, "morning");
    const b = buildFoundryFloorCompositionPrompt(canon, "morning");
    expect(a).toBe(b);
  });
});
