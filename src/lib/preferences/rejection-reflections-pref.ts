/**
 * R9.6 — Typed preference helper for the rejection-autopsy opt-in.
 *
 * Storage shape: lives under the `rejectionReflections` key of the
 * `user_profiles.preferences` jsonb column. Defensive read — any invalid
 * shape returns the default ON value (partner constraint: default ON with
 * clear opt-out copy in Settings → Analytics).
 *
 * Used by:
 *   - `src/app/(authenticated)/settings/page.tsx` to seed the toggle.
 *   - `src/components/floor-7/WarRoomClient.tsx` (R9.6 follow-up) to gate
 *     whether `showReflectionStrip=true` flows down to the card.
 */
import { z } from "zod";

export const REJECTION_REFLECTIONS_PREF_KEY = "rejectionReflections" as const;

export const RejectionReflectionsPrefSchema = z.object({
  enabled: z.boolean(),
});

export type RejectionReflectionsPref = z.infer<
  typeof RejectionReflectionsPrefSchema
>;

export const DEFAULT_REJECTION_REFLECTIONS_PREF: RejectionReflectionsPref = {
  enabled: true,
};

/**
 * Read the rejection-reflections preference from a `user_profiles.preferences`
 * jsonb. Returns the default `{ enabled: true }` on any of:
 *   - `preferences` is null / undefined
 *   - `preferences` is not an object
 *   - the namespaced key is absent
 *   - the namespaced value fails the schema (e.g. `{ enabled: "yes" }`)
 */
export function readRejectionReflectionsPref(
  preferences: unknown,
): RejectionReflectionsPref {
  if (!preferences || typeof preferences !== "object") {
    return DEFAULT_REJECTION_REFLECTIONS_PREF;
  }
  const blob = preferences as Record<string, unknown>;
  const raw = blob[REJECTION_REFLECTIONS_PREF_KEY];
  if (raw === undefined) return DEFAULT_REJECTION_REFLECTIONS_PREF;
  const parsed = RejectionReflectionsPrefSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_REJECTION_REFLECTIONS_PREF;
  return parsed.data;
}
