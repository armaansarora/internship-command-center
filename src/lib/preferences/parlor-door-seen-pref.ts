/**
 * Parlor door first-materialization latch.
 *
 * Storage shape: lives under the `parlorDoorSeen` key of
 * `user_profiles.preferences` jsonb. The Parlor door must be ABSENT from
 * the DOM before the first offer parses. When the first offer arrives,
 * the door materializes with a single cinematic beat; this latch records
 * that the beat has been shown so subsequent visits skip the entrance
 * animation and render the door in its steady state.
 *
 * Default is `{ seen: false }` — the first offer triggers the
 * materialization; later renders see the door statically.
 *
 * Registered in PREF_VALUE_SCHEMAS at
 * `src/app/api/profile/preferences/route.ts`.
 */
import { z } from "zod/v4";

export const PARLOR_DOOR_SEEN_PREF_KEY = "parlorDoorSeen" as const;

export const ParlorDoorSeenPrefSchema = z.object({ seen: z.boolean() }).strict();

export type ParlorDoorSeenPref = z.infer<typeof ParlorDoorSeenPrefSchema>;

export const PARLOR_DOOR_SEEN_DEFAULT: ParlorDoorSeenPref = { seen: false };
