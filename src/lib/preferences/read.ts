/**
 * R10.5 — Generic preference reader.
 *
 * Reads a single namespaced value out of the `user_profiles.preferences`
 * jsonb blob. The write side goes through the validated POST handler at
 * `src/app/api/profile/preferences/route.ts`, which guarantees each
 * namespaced value matches its per-key Zod schema — callers of this
 * helper can therefore cast to the expected shape. We still return `T | null`
 * so forgotten-to-write keys surface as a plain null rather than blowing up
 * the consumer.
 *
 * Safe-fallback contract: any read error — network failure, missing row,
 * malformed jsonb, missing key — returns `null`. Never throws. This means
 * a consumer that couldn't read the latch will simply replay the first-run
 * experience on a subsequent load, which is always preferable to a runtime
 * crash on a cold path.
 *
 * Usage:
 *   const latch = await getUserPreferenceValue<{ seen: boolean }>(
 *     supabase, user.id, PARLOR_DOOR_SEEN_PREF_KEY,
 *   );
 *   const alreadySeen = latch?.seen ?? false;
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserPreferenceValue<T>(
  client: SupabaseClient,
  userId: string,
  key: string,
): Promise<T | null> {
  try {
    const { data, error } = await client
      .from("user_profiles")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();

    if (error) return null;
    if (!data) return null;

    const prefs = (data as { preferences?: unknown }).preferences;
    if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return null;

    const value = (prefs as Record<string, unknown>)[key];
    if (value === undefined) return null;

    return value as T;
  } catch {
    // The Supabase client *shouldn't* throw — error is returned in `error` —
    // but we swallow any stray synchronous throw for safety on a cold path.
    return null;
  }
}
