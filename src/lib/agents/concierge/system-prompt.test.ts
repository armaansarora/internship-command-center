/**
 * Otis system prompt contract tests.
 *
 * The Concierge's voice is strict: no emoji outside a single ☞, no
 * exclamation-point abuse, no banned startup phrases, explicit greeting
 * branches by local hour. These tests lock that contract so a future
 * prompt-polish pass can't silently drift.
 */
import { describe, it, expect } from "vitest";
import {
  buildOtisSystemPrompt,
  timeOfDayGreeting,
} from "./system-prompt";

describe("R4.3 Otis system prompt — voice & shape", () => {
  it("greets differently at each key hour", () => {
    expect(timeOfDayGreeting(2)).toBe("Late hour");
    expect(timeOfDayGreeting(8)).toBe("Morning");
    expect(timeOfDayGreeting(13)).toBe("Afternoon");
    expect(timeOfDayGreeting(19)).toBe("Evening");
    expect(timeOfDayGreeting(23)).toBe("Late hour");
  });

  it("defaults to Evening for out-of-range hour inputs", () => {
    expect(timeOfDayGreeting(-1)).toBe("Evening");
    expect(timeOfDayGreeting(99)).toBe("Evening");
    expect(timeOfDayGreeting(Number.NaN)).toBe("Evening");
  });

  it("names and forbids banned surface copy (each appears inside a negation clause)", () => {
    const prompt = buildOtisSystemPrompt({
      guestName: "Test",
      timezone: "America/New_York",
      localHour: 9,
      isFirstVisit: true,
      lastFloorVisitedLabel: "",
    });
    // Each banned phrase must appear — but only in a "No …" / "Banned" /
    // negation clause. We assert presence-in-negation rather than absence
    // so the prompt genuinely forbids the phrase to the model.
    const bannedInNoClause = [
      /No "?Welcome back!?"?/i,
      /No startup cringe\.|No "?let's crush it/i,
    ];
    for (const re of bannedInNoClause) {
      expect(prompt).toMatch(re);
    }
    // No decorative emoji the brief forbids.
    expect(prompt).not.toContain("🎉");
    expect(prompt).not.toContain("🚀");
  });

  it("explicitly mentions the ☞ hand-off glyph and forbids other emoji", () => {
    const prompt = buildOtisSystemPrompt({
      guestName: "Test",
      timezone: "America/New_York",
      localHour: 9,
      isFirstVisit: true,
      lastFloorVisitedLabel: "",
    });
    expect(prompt).toContain("☞");
    expect(prompt.toLowerCase()).toContain("no emoji except");
  });

  it("branches differently for first-time vs returning guests", () => {
    const first = buildOtisSystemPrompt({
      guestName: "Armaan",
      timezone: "America/New_York",
      localHour: 9,
      isFirstVisit: true,
      lastFloorVisitedLabel: "",
    });
    const returning = buildOtisSystemPrompt({
      guestName: "Armaan",
      timezone: "America/New_York",
      localHour: 9,
      isFirstVisit: false,
      lastFloorVisitedLabel: "the Observatory",
    });
    expect(first).toContain("first time");
    expect(returning).toContain("Observatory");
    expect(returning).toContain("Do not re-intake");
  });

  it("carries the intake order (roles → geos → timing → dealbreakers)", () => {
    const prompt = buildOtisSystemPrompt({
      guestName: "",
      timezone: "UTC",
      localHour: 10,
      isFirstVisit: true,
      lastFloorVisitedLabel: "",
    });
    const rolesIdx = prompt.search(/roles/i);
    const geosIdx = prompt.search(/geograph/i);
    const timingIdx = prompt.search(/timing/i);
    expect(rolesIdx).toBeGreaterThan(0);
    expect(geosIdx).toBeGreaterThan(rolesIdx);
    expect(timingIdx).toBeGreaterThan(geosIdx);
  });

  it("names the Concierge explicitly and forbids C-suite dispatch talk", () => {
    const prompt = buildOtisSystemPrompt({
      guestName: "",
      timezone: "UTC",
      localHour: 10,
      isFirstVisit: true,
      lastFloorVisitedLabel: "",
    });
    expect(prompt).toContain("Otis");
    expect(prompt).toContain("Concierge");
    expect(prompt).toContain("not a C-suite agent");
  });
});
