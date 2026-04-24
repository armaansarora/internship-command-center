import { describe, it, expect } from "vitest";
import { CEO_VOICE_PREF_KEY, CeoVoicePrefSchema } from "../ceo-voice-pref";
import {
  PARLOR_DOOR_SEEN_PREF_KEY,
  ParlorDoorSeenPrefSchema,
} from "../parlor-door-seen-pref";
import {
  PARLOR_CFO_QUIP_PREF_KEY,
  ParlorCfoQuipPrefSchema,
} from "../parlor-cfo-quip-pref";

/**
 * R10.1 — Preference-key contract tests for the three new R10 keys.
 *
 * Each key lives under its namespaced slot in `user_profiles.preferences`
 * jsonb and is validated by a strict Zod schema. The keys are whitelisted
 * by the generic POST /api/profile/preferences endpoint, and the same
 * schema is reused on read by per-surface opt-in checks inside the
 * Negotiation Parlor (CEO voice read-aloud, door-seen latch, CFO
 * entry-quip latch).
 */

describe("R10 preference keys", () => {
  it("ceoVoice key is stable and schema accepts/rejects correctly", () => {
    expect(CEO_VOICE_PREF_KEY).toBe("ceoVoice");
    expect(CeoVoicePrefSchema.parse({ enabled: false })).toEqual({
      enabled: false,
    });
    expect(CeoVoicePrefSchema.parse({ enabled: true })).toEqual({
      enabled: true,
    });
    expect(() => CeoVoicePrefSchema.parse({ enabled: "yes" })).toThrow();
    expect(() => CeoVoicePrefSchema.parse({})).toThrow();
    expect(() =>
      CeoVoicePrefSchema.parse({ enabled: true, extra: 1 }),
    ).toThrow();
  });

  it("parlorDoorSeen key is stable", () => {
    expect(PARLOR_DOOR_SEEN_PREF_KEY).toBe("parlorDoorSeen");
    expect(ParlorDoorSeenPrefSchema.parse({ seen: true })).toEqual({
      seen: true,
    });
    expect(() => ParlorDoorSeenPrefSchema.parse({ seen: 1 })).toThrow();
  });

  it("parlorCfoQuipShown key is stable", () => {
    expect(PARLOR_CFO_QUIP_PREF_KEY).toBe("parlorCfoQuipShown");
    expect(ParlorCfoQuipPrefSchema.parse({ shown: true })).toEqual({
      shown: true,
    });
  });
});
