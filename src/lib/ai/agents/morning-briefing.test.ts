import { describe, it, expect } from "vitest";
import {
  MorningBriefingSchema,
  BriefingBeatSchema,
  renderBriefingScript,
  deriveWeatherHint,
  type MorningBriefing,
} from "./morning-briefing";

describe("morning-briefing schema + pure helpers", () => {
  const sample: MorningBriefing = {
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

  it("schema parses a canonical briefing", () => {
    const parsed = MorningBriefingSchema.parse(sample);
    expect(parsed.beats.length).toBe(4);
    expect(parsed.mood).toBe("sharp");
    expect(parsed.weather_hint).toBe("gold");
  });

  it("schema enforces beats.length ∈ [3, 6]", () => {
    expect(() =>
      MorningBriefingSchema.parse({ ...sample, beats: sample.beats.slice(0, 2) })
    ).toThrow();

    const tooMany = {
      ...sample,
      beats: Array.from({ length: 7 }, () => ({
        tone: "steady" as const,
        text: "One more beat than the cap allows",
      })),
    };
    expect(() => MorningBriefingSchema.parse(tooMany)).toThrow();
  });

  it("schema enforces beat text ≤ 140 chars", () => {
    const tooLong = "X".repeat(141);
    expect(() =>
      BriefingBeatSchema.parse({ tone: "steady", text: tooLong })
    ).toThrow();
  });

  it("schema rejects unknown tone values", () => {
    expect(() =>
      BriefingBeatSchema.parse({ tone: "cheerful", text: "A valid text body" })
    ).toThrow();
  });

  it("schema rejects version != 'v2' (future versions must bump)", () => {
    expect(() =>
      MorningBriefingSchema.parse({ ...sample, version: "v3" })
    ).toThrow();
  });

  it("schema rejects mood outside the closed set", () => {
    expect(() =>
      MorningBriefingSchema.parse({ ...sample, mood: "aggressive" })
    ).toThrow();
  });

  it("renderBriefingScript joins beats with single spaces and trims", () => {
    const joined = renderBriefingScript({
      beats: [
        { tone: "steady", text: "  Morning. " },
        { tone: "warm", text: "Three new ops." },
        { tone: "steady", text: "" }, // empty filtered
        { tone: "steady", text: "Let's move." },
      ],
    });
    expect(joined).toBe("Morning. Three new ops. Let's move.");
  });

  it("renderBriefingScript is stable across identical input", () => {
    const a = renderBriefingScript(sample);
    const b = renderBriefingScript(sample);
    expect(a).toBe(b);
  });

  it("deriveWeatherHint maps moods deterministically", () => {
    expect(deriveWeatherHint("charged")).toBe("gold");
    expect(deriveWeatherHint("warm")).toBe("gold");
    expect(deriveWeatherHint("sharp")).toBe("silver");
    expect(deriveWeatherHint("cautious")).toBe("silver");
    expect(deriveWeatherHint("quiet")).toBe("dim");
  });

  it("schema preserves optional data_cue when present", () => {
    const parsed = MorningBriefingSchema.parse(sample);
    expect(parsed.beats[1].data_cue).toBe("new_app");
    expect(parsed.beats[0].data_cue).toBeUndefined();
  });

  it("schema rejects empty beat text", () => {
    expect(() =>
      BriefingBeatSchema.parse({ tone: "steady", text: "short" })
    ).toThrow(); // 5 chars — below min(6)
  });
});
