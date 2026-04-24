/**
 * R10.1 — CEO voice read-aloud preference.
 *
 * Storage shape: lives under the `ceoVoice` key of `user_profiles.preferences`
 * jsonb. The Negotiation Parlor (Floor 1 C-Suite annex) reads negotiation
 * drafts aloud in CEO voice when enabled. Voice is opt-in — default OFF —
 * and gated by the three-layer pattern R6 voice uses: Settings toggle →
 * per-surface enable check → graceful fallback when unavailable. Voice is
 * never required to ship a negotiation script.
 *
 * Registered in PREF_VALUE_SCHEMAS at
 * `src/app/api/profile/preferences/route.ts`.
 */
import { z } from "zod/v4";

export const CEO_VOICE_PREF_KEY = "ceoVoice" as const;

export const CeoVoicePrefSchema = z.object({ enabled: z.boolean() }).strict();

export type CeoVoicePref = z.infer<typeof CeoVoicePrefSchema>;

export const CEO_VOICE_PREF_DEFAULT: CeoVoicePref = { enabled: false };

/**
 * R10.11 — Defensive read of the `ceoVoice` pref off a `user_profiles.preferences`
 * jsonb blob. Mirrors `readRejectionReflectionsPref`: any invalid or absent
 * shape returns the default OFF value. Voice is opt-in; we never surprise
 * the user with audio by accident, so "missing" always resolves to "off."
 */
export function readCeoVoicePref(preferences: unknown): CeoVoicePref {
  if (!preferences || typeof preferences !== "object") {
    return CEO_VOICE_PREF_DEFAULT;
  }
  const blob = preferences as Record<string, unknown>;
  const raw = blob[CEO_VOICE_PREF_KEY];
  if (raw === undefined) return CEO_VOICE_PREF_DEFAULT;
  const parsed = CeoVoicePrefSchema.safeParse(raw);
  if (!parsed.success) return CEO_VOICE_PREF_DEFAULT;
  return parsed.data;
}
