import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { createClient, requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { countOffersForUser } from "@/lib/db/queries/offers-rest";
import { CSuiteClient } from "@/components/floor-1/CSuiteClient";
import { getUserPreferenceValue } from "@/lib/preferences/read";
import {
  PARLOR_DOOR_SEEN_PREF_KEY,
  type ParlorDoorSeenPref,
} from "@/lib/preferences/parlor-door-seen-pref";

export const metadata: Metadata = { title: "The C-Suite | The Tower" };

/** Floor 1 — The C-Suite (CEO Orchestration).
 *
 * Skyline paints immediately; CEO orchestration data streams into the
 * Suspense boundary so first paint isn't blocked.
 *
 * R10.5 — The Negotiation Parlor door is gated by `offerCount > 0`.
 * When the user has zero offers, `hasParlorDoor` stays false and the
 * door is ABSENT from the DOM (see the absence proof test). When the
 * first offer parses, the next page load computes `hasParlorDoor=true`
 * and — if the `parlorDoorSeen` latch isn't set yet — also
 * `firstAppearance=true`, which drives the 2.3s cinematic
 * materialization beat exactly once.
 */
export default async function CSuitePage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="1">
      <Suspense fallback={null}>
        <CSuiteData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function CSuiteData({ userId }: { userId: string }): Promise<JSX.Element> {
  const supabase = await createClient();

  const [stats, offerCount, doorSeenPref] = await Promise.all([
    getPipelineStatsRest(userId),
    countOffersForUser(supabase, userId),
    getUserPreferenceValue<ParlorDoorSeenPref>(
      supabase,
      userId,
      PARLOR_DOOR_SEEN_PREF_KEY,
    ),
  ]);

  const hasParlorDoor = offerCount > 0;
  const alreadySeen = doorSeenPref?.seen ?? false;
  const firstAppearance = hasParlorDoor && !alreadySeen;

  return (
    <CSuiteClient
      stats={stats}
      hasParlorDoor={hasParlorDoor}
      firstAppearance={firstAppearance}
    />
  );
}
