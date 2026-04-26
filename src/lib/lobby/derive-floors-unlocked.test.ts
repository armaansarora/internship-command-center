import { describe, it, expect } from "vitest";
import { deriveFloorsUnlocked, type ActivitySignal } from "./derive-floors-unlocked";

/**
 * Building Directory derivation tests.
 *
 * The Lobby paints the Tower's 9-floor cross-section with each row either lit
 * (the user has "reached" that floor through activity) or ghosted. The mapping
 * from user activity → unlocked floor set is a pure function, so it's tested
 * here in isolation from the rendering layer.
 *
 * Contract (from R4.8 brief):
 *   hasApplications → unlock "7"
 *   hasContacts     → unlock "6"
 *   hasInterviews   → unlock "3"
 *   hasCoverLetters → unlock "5"
 *   hasFollowUps    → unlock "4"
 *   hasBriefing     → unlock "PH", "1", "2"
 *   conciergeCompleted → unlock "1"
 *
 * "L" is always present (everyone is in the Lobby).
 */

const EMPTY: ActivitySignal = {
  hasApplications: false,
  hasContacts: false,
  hasInterviews: false,
  hasCoverLetters: false,
  hasFollowUps: false,
  hasBriefing: false,
  conciergeCompleted: false,
};

describe("deriveFloorsUnlocked", () => {
  it("cold open — no activity returns only the Lobby", () => {
    expect(deriveFloorsUnlocked(EMPTY)).toEqual(["L"]);
  });

  it("applications-only — Lobby plus floor 7", () => {
    const floors = deriveFloorsUnlocked({ ...EMPTY, hasApplications: true });
    expect(floors).toContain("L");
    expect(floors).toContain("7");
    expect(floors).toHaveLength(2);
  });

  it("contacts-only — Lobby plus floor 6", () => {
    const floors = deriveFloorsUnlocked({ ...EMPTY, hasContacts: true });
    expect(floors).toContain("L");
    expect(floors).toContain("6");
    expect(floors).toHaveLength(2);
  });

  it("full-active user unlocks all 9 floors", () => {
    const allActive: ActivitySignal = {
      hasApplications: true,
      hasContacts: true,
      hasInterviews: true,
      hasCoverLetters: true,
      hasFollowUps: true,
      hasBriefing: true,
      conciergeCompleted: true,
    };
    const floors = deriveFloorsUnlocked(allActive);
    // All 9 floor ids must be present.
    expect(new Set(floors)).toEqual(
      new Set(["L", "PH", "7", "6", "5", "4", "3", "2", "1"]),
    );
    expect(floors).toHaveLength(9);
  });

  it("briefing without apps — Lobby plus PH, 1, 2", () => {
    const floors = deriveFloorsUnlocked({ ...EMPTY, hasBriefing: true });
    expect(new Set(floors)).toEqual(new Set(["L", "PH", "1", "2"]));
  });

  it("concierge-only — Lobby plus floor 1 (CEO available once onboarded)", () => {
    const floors = deriveFloorsUnlocked({ ...EMPTY, conciergeCompleted: true });
    expect(new Set(floors)).toEqual(new Set(["L", "1"]));
  });

  it("contacts + follow-ups — Lobby plus 6 and 4, nothing else", () => {
    const floors = deriveFloorsUnlocked({
      ...EMPTY,
      hasContacts: true,
      hasFollowUps: true,
    });
    expect(new Set(floors)).toEqual(new Set(["L", "6", "4"]));
  });

  it("deduplicates when briefing + concierge both want floor 1", () => {
    // hasBriefing unlocks "1"; conciergeCompleted also unlocks "1".
    // The output must contain "1" exactly once.
    const floors = deriveFloorsUnlocked({
      ...EMPTY,
      hasBriefing: true,
      conciergeCompleted: true,
    });
    const ones = floors.filter((f) => f === "1");
    expect(ones).toHaveLength(1);
    // And the full set is still correct.
    expect(new Set(floors)).toEqual(new Set(["L", "PH", "1", "2"]));
  });

  it("always includes L even when every other flag is false", () => {
    // Redundant with cold-open but defends against a regression where
    // someone accidentally gates "L" behind a signal.
    const floors = deriveFloorsUnlocked(EMPTY);
    expect(floors[0]).toBe("L");
  });
});
