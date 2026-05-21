import { describe, expect, it } from "vitest";
import { detectAmbiguity } from "./ambiguity-detector";

describe("ambiguity detector", () => {
  it("fires on -compatible style envelope modifier (Rafe→Otis bug)", () => {
    const result = detectAmbiguity({
      request: "based on Tower/Otis-compatible style envelope, make Rafe Calder",
    });
    expect(result.ambiguous).toBe(true);
    expect(result.reasonCodes).toContain("style-reference-modifier");
    expect(result.mentions.length).toBeGreaterThanOrEqual(2);
  });

  it("fires on multiple character names with for/as/like phrasing", () => {
    const result = detectAmbiguity({ request: "make Rafe like Otis but louder" });
    expect(result.ambiguous).toBe(true);
    expect(result.reasonCodes).toContain("multiple-character-cross-reference");
  });

  it("returns ambiguous=false on a clean request", () => {
    const result = detectAmbiguity({ request: "make Sol Navarro" });
    expect(result.ambiguous).toBe(false);
    expect(result.mentions[0]?.characterId).toBe("cno");
  });

  it("fires on style/envelope/language/reference/look modifiers", () => {
    for (const word of ["style", "envelope", "language", "reference", "look"]) {
      const result = detectAmbiguity({ request: `make Vera with the Otis ${word}` });
      expect(result.ambiguous).toBe(true);
    }
  });
});
