import { describe, it, expect } from "vitest";
import {
  encodeBriefing,
  decodeBriefing,
  wrapLegacy,
  BRIEFING_PREFIX,
} from "./briefing-storage";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";

const briefing: MorningBriefing = {
  version: "v2",
  generated_at: "2026-04-22T13:00:00.000Z",
  script:
    "Morning, Armaan. Three new ops landed overnight. One interview invite from Scale. That's today's priority.",
  beats: [
    { tone: "steady", text: "Morning, Armaan." },
    {
      tone: "warm",
      text: "Three new ops landed overnight — all within your shortlist.",
      data_cue: "new_app",
    },
    {
      tone: "urgent",
      text: "One interview invite from Scale AI. That's your priority before noon.",
      data_cue: "interview_invite",
    },
    { tone: "steady", text: "Everything else can wait. Let's start there." },
  ],
  mood: "sharp",
  weather_hint: "gold",
};

describe("briefing-storage encode/decode", () => {
  it("encodeBriefing prefixes and JSON-serializes", () => {
    const encoded = encodeBriefing(briefing);
    expect(encoded.startsWith(BRIEFING_PREFIX)).toBe(true);
    expect(encoded).toContain('"version":"v2"');
    expect(encoded).toContain('"mood":"sharp"');
  });

  it("round-trips losslessly", () => {
    const encoded = encodeBriefing(briefing);
    const decoded = decodeBriefing(encoded);
    expect(decoded).toEqual(briefing);
  });

  it("returns null for null / empty bodies", () => {
    expect(decodeBriefing(null)).toBeNull();
    expect(decodeBriefing(undefined)).toBeNull();
    expect(decodeBriefing("")).toBeNull();
    expect(decodeBriefing("   ")).toBeNull();
  });

  it("decodes a legacy plain-text body into a structured briefing", () => {
    const legacy =
      "Morning, Armaan. Pipeline: 5 active ops. 2 status changes. ⚠ 3 stale ops need attention.";
    const decoded = decodeBriefing(legacy);
    expect(decoded).not.toBeNull();
    expect(decoded!.version).toBe("v2");
    expect(decoded!.mood).toBe("cautious");
    expect(decoded!.weather_hint).toBe("cool");
    expect(decoded!.beats.length).toBeGreaterThanOrEqual(3);
    // Warning beat preserved with 'warning' tone.
    expect(decoded!.beats.some((b) => b.tone === "warning")).toBe(true);
  });

  it("wraps a malformed v2 body into a legacy-style briefing rather than returning null", () => {
    const bogus = `${BRIEFING_PREFIX}{"version":"v2","beats":"not-an-array"}`;
    const decoded = decodeBriefing(bogus);
    expect(decoded).not.toBeNull();
    expect(decoded!.version).toBe("v2");
    // fallback path produces ≥ 3 beats
    expect(decoded!.beats.length).toBeGreaterThanOrEqual(3);
  });

  it("pads a very short legacy body with reflective fillers to reach 3 beats", () => {
    const decoded = decodeBriefing("Morning.");
    expect(decoded).not.toBeNull();
    expect(decoded!.beats.length).toBe(3);
    expect(decoded!.beats[0].text).toBe("Morning.");
    expect(decoded!.beats[1].tone).toBe("reflective");
  });

  it("caps legacy bodies to at most 6 beats", () => {
    const many = Array.from({ length: 10 }, (_, i) => `Beat ${i + 1} line.`).join(" ");
    const decoded = decodeBriefing(many);
    expect(decoded).not.toBeNull();
    expect(decoded!.beats.length).toBeLessThanOrEqual(6);
  });

  it("truncates over-long legacy beat text to respect schema", () => {
    const long = "A".repeat(200);
    const decoded = decodeBriefing(`${long}. Something else.`);
    expect(decoded).not.toBeNull();
    for (const beat of decoded!.beats) {
      expect(beat.text.length).toBeLessThanOrEqual(140);
    }
  });

  it("wrapLegacy produces a schema-valid briefing for any reasonable plain input", () => {
    const cases = ["Morning.", "Pipeline empty.", "Offer landed! 🎉 Move."];
    for (const input of cases) {
      const wrapped = wrapLegacy(input);
      expect(wrapped.version).toBe("v2");
      expect(wrapped.beats.length).toBeGreaterThanOrEqual(3);
      expect(wrapped.beats.length).toBeLessThanOrEqual(6);
    }
  });
});
