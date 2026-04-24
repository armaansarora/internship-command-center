/**
 * R10.1 — CFO entry-quip shown latch for the Parlor.
 *
 * Storage shape: lives under the `parlorCfoQuipShown` key of
 * `user_profiles.preferences` jsonb. When the user first enters the
 * Negotiation Parlor after their first offer arrives, the CFO delivers
 * a one-time quip about the comp band. This latch records that the quip
 * has been shown so the CFO doesn't repeat it on subsequent visits.
 *
 * Default is `{ shown: false }` — the first parlor visit triggers the
 * CFO quip once; later visits see the CFO silent on entry.
 *
 * Registered in PREF_VALUE_SCHEMAS at
 * `src/app/api/profile/preferences/route.ts`.
 */
import { z } from "zod/v4";

export const PARLOR_CFO_QUIP_PREF_KEY = "parlorCfoQuipShown" as const;

export const ParlorCfoQuipPrefSchema = z.object({ shown: z.boolean() }).strict();

export type ParlorCfoQuipPref = z.infer<typeof ParlorCfoQuipPrefSchema>;

export const PARLOR_CFO_QUIP_DEFAULT: ParlorCfoQuipPref = { shown: false };

/**
 * R10.12 — Defensive read of the `parlorCfoQuipShown` latch off a
 * `user_profiles.preferences` jsonb blob. Mirrors `readCeoVoicePref`:
 * any invalid or absent shape returns the default `{ shown: false }`.
 *
 * Default OFF means: a brand-new user who hasn't visited the Parlor
 * yet (or whose preferences blob is corrupt) sees the CFO quip on their
 * next first-entry, which is always the desired first-run experience.
 * Once the overlay dismisses, the client POSTs `{ shown: true }` and
 * subsequent reads return the latched value.
 */
export function readParlorCfoQuipPref(preferences: unknown): ParlorCfoQuipPref {
  if (!preferences || typeof preferences !== "object") {
    return PARLOR_CFO_QUIP_DEFAULT;
  }
  const blob = preferences as Record<string, unknown>;
  const raw = blob[PARLOR_CFO_QUIP_PREF_KEY];
  if (raw === undefined) return PARLOR_CFO_QUIP_DEFAULT;
  const parsed = ParlorCfoQuipPrefSchema.safeParse(raw);
  if (!parsed.success) return PARLOR_CFO_QUIP_DEFAULT;
  return parsed.data;
}
