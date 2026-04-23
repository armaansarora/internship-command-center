import { describe, it, expect } from "vitest";
import { synthesizeFallbackBriefing } from "./briefing-fallback";
import { MorningBriefingSchema } from "@/lib/ai/agents/morning-briefing";

const empty = {
  displayName: "Armaan",
  pipeline: {
    total: 0,
    applied: 0,
    screening: 0,
    interviews: 0,
    offers: 0,
    staleCount: 0,
    appliedToScreeningRate: 0,
  },
  overnight: {
    newApps: 0,
    statusChanges: 0,
    importantEmails: [],
    rejections: 0,
  },
};

describe("synthesizeFallbackBriefing", () => {
  it("produces a schema-valid briefing for an empty cold-open user", () => {
    const b = synthesizeFallbackBriefing(empty);
    expect(() => MorningBriefingSchema.parse(b)).not.toThrow();
    expect(b.mood).toBe("quiet");
    expect(b.weather_hint).toBe("cool");
    expect(b.beats.length).toBeGreaterThanOrEqual(3);
  });

  it("greets the user by display name in the first beat", () => {
    const b = synthesizeFallbackBriefing({ ...empty, displayName: "Jane" });
    expect(b.beats[0].text).toContain("Jane");
  });

  it("reflects new applications with a data_cue", () => {
    const b = synthesizeFallbackBriefing({
      ...empty,
      overnight: { ...empty.overnight, newApps: 3 },
      pipeline: { ...empty.pipeline, total: 3, applied: 3 },
    });
    expect(() => MorningBriefingSchema.parse(b)).not.toThrow();
    expect(b.beats.some((x) => x.data_cue === "new_app")).toBe(true);
    expect(b.mood).toBe("warm");
  });

  it("surfaces an interview invite as an urgent beat", () => {
    const b = synthesizeFallbackBriefing({
      ...empty,
      overnight: {
        ...empty.overnight,
        importantEmails: [{ kind: "interview_invite", subject: "Chat at Scale AI" }],
      },
      pipeline: { ...empty.pipeline, total: 1, applied: 1 },
    });
    expect(() => MorningBriefingSchema.parse(b)).not.toThrow();
    expect(b.mood).toBe("sharp");
    expect(b.weather_hint).toBe("gold");
    expect(b.beats.some((x) => x.tone === "urgent")).toBe(true);
    expect(b.beats.some((x) => x.data_cue === "interview_invite")).toBe(true);
  });

  it("surfaces an offer with 'charged' mood", () => {
    const b = synthesizeFallbackBriefing({
      ...empty,
      overnight: {
        ...empty.overnight,
        importantEmails: [{ kind: "offer", subject: "Your offer from Stripe" }],
      },
      pipeline: { ...empty.pipeline, total: 1, applied: 1 },
    });
    expect(b.mood).toBe("charged");
    expect(b.beats.some((x) => x.data_cue === "offer")).toBe(true);
  });

  it("surfaces stale pile as a warning beat when ≥ 3", () => {
    const b = synthesizeFallbackBriefing({
      ...empty,
      pipeline: { ...empty.pipeline, total: 10, applied: 10, staleCount: 4 },
    });
    expect(() => MorningBriefingSchema.parse(b)).not.toThrow();
    expect(b.beats.some((x) => x.tone === "warning" && x.data_cue === "stale")).toBe(true);
  });

  it("surfaces rejections with reflective tone, not broadcast", () => {
    const b = synthesizeFallbackBriefing({
      ...empty,
      overnight: { ...empty.overnight, rejections: 2 },
      pipeline: { ...empty.pipeline, total: 5, applied: 5 },
    });
    expect(b.mood).toBe("cautious");
    expect(b.weather_hint).toBe("dim");
    expect(b.beats.some((x) => x.data_cue === "rejection")).toBe(true);
  });

  it("never exceeds the 6-beat schema cap", () => {
    const rich = synthesizeFallbackBriefing({
      ...empty,
      overnight: {
        newApps: 5,
        statusChanges: 3,
        importantEmails: [
          { kind: "interview_invite", subject: "S1" },
          { kind: "offer", subject: "S2" },
        ],
        rejections: 2,
      },
      pipeline: { ...empty.pipeline, total: 12, applied: 12, staleCount: 5, interviews: 2 },
    });
    expect(rich.beats.length).toBeLessThanOrEqual(6);
  });

  it("is deterministic for identical input", () => {
    const a = synthesizeFallbackBriefing(empty);
    const b = synthesizeFallbackBriefing(empty);
    // generated_at differs; compare structure instead
    expect(a.beats).toEqual(b.beats);
    expect(a.mood).toBe(b.mood);
    expect(a.weather_hint).toBe(b.weather_hint);
  });
});
