import { describe, it, expect } from "vitest";
import { userProfiles } from "./schema";

describe("R6 schema — user_profiles", () => {
  it("has voice_recording_enabled column", () => {
    expect(userProfiles.voiceRecordingEnabled).toBeDefined();
    // drizzle column has .notNull as a boolean property after `.notNull()`
    expect((userProfiles.voiceRecordingEnabled as unknown as { notNull?: boolean }).notNull).toBe(true);
  });

  it("has voice_recording_permanently_disabled column", () => {
    expect(userProfiles.voiceRecordingPermanentlyDisabled).toBeDefined();
  });

  it("has drill_preferences column", () => {
    expect(userProfiles.drillPreferences).toBeDefined();
  });
});

describe("R6 DebriefContent type", () => {
  it("parses a canonical debrief JSON", async () => {
    const { parseDebriefContent } = await import("@/types/debrief");
    const json = JSON.stringify({
      source: "drill",
      interviewId: "00000000-0000-0000-0000-000000000000",
      company: "CBRE",
      round: "1",
      questions: [
        {
          id: "q1",
          text: "Tell me about a time you led a team.",
          category: "behavioral",
          answer: { text: "When I was...", durationMs: 72000, audioPath: null },
          stars: { s: 85, t: 60, a: 90, r: 70 },
          score: 80,
          narrative: "Strong Situation and Action. Result was vague.",
          interrupts: [{ type: "no_result", atMs: 45000 }],
        },
      ],
      totalScore: 80,
      cpoFeedback: "Tighten your outcomes.",
      createdAt: "2026-04-23T00:00:00.000Z",
    });
    const parsed = parseDebriefContent(json);
    expect(parsed.source).toBe("drill");
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].stars.s).toBe(85);
  });

  it("rejects malformed JSON", async () => {
    const { parseDebriefContent } = await import("@/types/debrief");
    expect(() => parseDebriefContent("not json")).toThrow();
  });

  it("stringify round-trips without loss", async () => {
    const { parseDebriefContent, stringifyDebriefContent } = await import("@/types/debrief");
    const original = {
      source: "drill" as const,
      interviewId: null,
      company: "Blackstone",
      round: "2",
      questions: [],
      totalScore: 0,
      cpoFeedback: "",
      createdAt: new Date().toISOString(),
    };
    const out = parseDebriefContent(stringifyDebriefContent(original));
    expect(out).toEqual(original);
  });
});
