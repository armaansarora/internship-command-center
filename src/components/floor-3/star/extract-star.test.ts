import { describe, it, expect } from "vitest";
import { extractStar } from "./extract-star";

describe("extractStar", () => {
  describe("Situation", () => {
    it.each([
      ["When I was at my last internship, the team was stuck on a migration.", "the team was stuck"],
      ["In my sophomore year, our CS club ran out of funding.", "cs club ran out"],
      ["At my previous role, sales pipelines were broken.", "sales pipelines were broken"],
    ])("classifies '%s' as Situation", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.situation.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Task", () => {
    it.each([
      ["I was asked to rebuild the onboarding flow.", "rebuild the onboarding"],
      ["My job was to unblock the pipeline.", "unblock the pipeline"],
      ["The goal was to ship before Q3.", "ship before q3"],
      ["I needed to cut render time in half.", "cut render time"],
    ])("classifies '%s' as Task", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.task.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Action", () => {
    it.each([
      ["I built a Slack bot that routed tickets.",             "built a slack bot"],
      ["I led weekly syncs with three teams.",                  "led weekly syncs"],
      ["I negotiated with vendors to drop the contract cost.",  "negotiated with vendors"],
      ["I decided to refactor the worker queue.",               "decided to refactor"],
      ["I shipped the redesign in four weeks.",                 "shipped the redesign"],
      ["I wrote a migration that cut rollback time.",           "wrote a migration"],
    ])("classifies '%s' as Action", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.action.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Result", () => {
    it.each([
      ["This resulted in a 25% drop in support tickets.",   "25%"],
      ["We saved $3M over the fiscal year.",                 "$3m"],
      ["Launched to 40k users on day one.",                  "40k"],
      ["The change grew engagement by 18 percent.",          "18 percent"],
    ])("classifies '%s' as Result", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.result.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Multi-column single paragraph", () => {
    it("handles a full STAR answer", () => {
      const text = [
        "When I was at Acme last summer, the data pipeline was dropping 20% of events.",
        "I was asked to figure out the root cause.",
        "I built a sampling harness and traced the issue to a flaky worker.",
        "This reduced event loss to under 1% within two weeks.",
      ].join(" ");
      const hints = extractStar(text);
      expect(hints.situation.length).toBeGreaterThan(0);
      expect(hints.task.length).toBeGreaterThan(0);
      expect(hints.action.length).toBeGreaterThan(0);
      expect(hints.result.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("returns empty columns for empty string", () => {
      const hints = extractStar("");
      expect(hints.situation).toEqual([]);
      expect(hints.task).toEqual([]);
      expect(hints.action).toEqual([]);
      expect(hints.result).toEqual([]);
    });

    it("returns empty columns for whitespace", () => {
      const hints = extractStar("   \n\t  ");
      expect(hints.situation).toEqual([]);
      expect(hints.task).toEqual([]);
      expect(hints.action).toEqual([]);
      expect(hints.result).toEqual([]);
    });

    it("truncates each column to at most 3 entries", () => {
      const text = Array.from({ length: 8 }, (_, i) => `I built thing ${i + 1}.`).join(" ");
      const hints = extractStar(text);
      expect(hints.action.length).toBeLessThanOrEqual(3);
    });

    it("never mis-attributes 'I think' as Action", () => {
      const hints = extractStar("I think we should also consider costs.");
      expect(hints.action.join(" ")).not.toContain("I think");
    });

    it("never mis-attributes 'I felt' as Action", () => {
      const hints = extractStar("I felt like the approach was wrong.");
      expect(hints.action.join(" ")).not.toContain("I felt");
    });

    it("treats third-person 'she built' as NOT action", () => {
      const hints = extractStar("She built a slack bot last year.");
      expect(hints.action).toEqual([]);
    });

    it("is deterministic — same input → same output", () => {
      const a = extractStar("I built a tool. Grew usage by 30%.");
      const b = extractStar("I built a tool. Grew usage by 30%.");
      expect(a).toEqual(b);
    });

    it("completes in under 10ms for a 2000-char input", () => {
      const big = "I built a tool. ".repeat(125);
      const t0 = performance.now();
      extractStar(big);
      expect(performance.now() - t0).toBeLessThan(10);
    });

    it("does not crash on punctuation-only input", () => {
      expect(() => extractStar("!?!?.")).not.toThrow();
      expect(extractStar("!?!?.")).toEqual({ situation: [], task: [], action: [], result: [] });
    });

    it("dedupes identical hits within a column", () => {
      const hints = extractStar("I built a bot. I built a bot. I built a bot.");
      expect(hints.action.length).toBeLessThanOrEqual(3);
      // The three identical sentences should dedupe to one entry
      expect(new Set(hints.action).size).toBe(hints.action.length);
    });

    it("handles mixed casing in triggers", () => {
      const hints = extractStar("WHEN I WAS AT MY LAST ROLE, THE TEAM WAS STUCK.");
      expect(hints.situation.length).toBeGreaterThan(0);
    });

    it("returns a well-shaped StarHints object with all four columns as arrays", () => {
      const hints = extractStar("I built a tool.");
      expect(Array.isArray(hints.situation)).toBe(true);
      expect(Array.isArray(hints.task)).toBe(true);
      expect(Array.isArray(hints.action)).toBe(true);
      expect(Array.isArray(hints.result)).toBe(true);
    });
  });
});
