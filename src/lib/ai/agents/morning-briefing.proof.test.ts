import { describe, it, expect } from "vitest";
import { synthesizeFallbackBriefing } from "@/lib/penthouse/briefing-fallback";
import { renderBriefingScript } from "./morning-briefing";

/**
 * R2 acceptance proof: different overnight activity must produce demonstrably
 * different briefings. The synthesizer (used when cron-generated briefings
 * are absent) is held to the same standard as the Claude agent — any two
 * meaningfully-different inputs must produce meaningfully-different outputs.
 *
 * This test locks the contract so any future regression that collapses the
 * output into a generic "daily briefing" template fails loudly.
 */

const basePipeline = {
  total: 0,
  applied: 0,
  screening: 0,
  interviews: 0,
  offers: 0,
  staleCount: 0,
  appliedToScreeningRate: 0,
};

describe("R2 proof — different nights produce different briefings", () => {
  it("rich overnight (3 new apps + interview invite) vs zero activity diverge on every axis", () => {
    const rich = synthesizeFallbackBriefing({
      displayName: "Armaan",
      pipeline: { ...basePipeline, total: 8, applied: 5, interviews: 1, staleCount: 0 },
      overnight: {
        newApps: 3,
        statusChanges: 2,
        importantEmails: [{ kind: "interview_invite", subject: "Chat at Scale AI next Tue" }],
        rejections: 0,
      },
    });
    const cold = synthesizeFallbackBriefing({
      displayName: "Armaan",
      pipeline: { ...basePipeline },
      overnight: {
        newApps: 0,
        statusChanges: 0,
        importantEmails: [],
        rejections: 0,
      },
    });

    // Scripts differ.
    expect(renderBriefingScript(rich)).not.toBe(renderBriefingScript(cold));

    // Moods diverge.
    expect(rich.mood).not.toBe(cold.mood);
    // Weather hints diverge.
    expect(rich.weather_hint).not.toBe(cold.weather_hint);

    // Rich briefing carries an urgent beat with the interview cue.
    expect(rich.beats.some((b) => b.data_cue === "interview_invite")).toBe(true);
    expect(rich.beats.some((b) => b.tone === "urgent")).toBe(true);

    // Cold briefing is reflective + quiet — not "nothing to report".
    expect(cold.mood).toBe("quiet");
    expect(cold.beats.some((b) => b.data_cue === "quiet")).toBe(true);
    expect(cold.beats.some((b) => b.tone === "reflective")).toBe(true);
  });

  it("rejection-heavy vs offer-landed diverge in mood, weather, and data_cue set", () => {
    const rejectionsNight = synthesizeFallbackBriefing({
      displayName: "Armaan",
      pipeline: { ...basePipeline, total: 5, applied: 5, staleCount: 0 },
      overnight: {
        newApps: 0,
        statusChanges: 0,
        importantEmails: [],
        rejections: 3,
      },
    });

    const offerNight = synthesizeFallbackBriefing({
      displayName: "Armaan",
      pipeline: { ...basePipeline, total: 5, applied: 4, offers: 1 },
      overnight: {
        newApps: 0,
        statusChanges: 1,
        importantEmails: [{ kind: "offer", subject: "Your offer from Stripe" }],
        rejections: 0,
      },
    });

    expect(rejectionsNight.mood).toBe("cautious");
    expect(offerNight.mood).toBe("charged");

    expect(rejectionsNight.weather_hint).toBe("dim");
    expect(offerNight.weather_hint).toBe("gold");

    // Data cue sets are disjoint on the axes that matter.
    const rejCues = rejectionsNight.beats.map((b) => b.data_cue).filter(Boolean);
    const offerCues = offerNight.beats.map((b) => b.data_cue).filter(Boolean);
    expect(rejCues).toContain("rejection");
    expect(offerCues).toContain("offer");
    expect(rejCues.some((c) => c === "offer")).toBe(false);
    expect(offerCues.some((c) => c === "rejection")).toBe(false);
  });

  it("stale pile dominates the briefing with a warning beat even when overnight is quiet", () => {
    const stale = synthesizeFallbackBriefing({
      displayName: "Armaan",
      pipeline: { ...basePipeline, total: 8, applied: 8, staleCount: 5 },
      overnight: {
        newApps: 0,
        statusChanges: 0,
        importantEmails: [],
        rejections: 0,
      },
    });

    expect(stale.beats.some((b) => b.tone === "warning" && b.data_cue === "stale")).toBe(true);
    expect(stale.mood).toBe("cautious");
    // A quiet-pipeline-but-no-stale night should NOT carry a warning beat.
    const easy = synthesizeFallbackBriefing({
      displayName: "Armaan",
      pipeline: { ...basePipeline, total: 8, applied: 8, staleCount: 0 },
      overnight: { newApps: 0, statusChanges: 0, importantEmails: [], rejections: 0 },
    });
    expect(easy.beats.some((b) => b.tone === "warning")).toBe(false);
  });
});
