import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { ObservatoryClient } from "@/components/floor-2/ObservatoryClient";

export const metadata: Metadata = { title: "The Observatory | The Tower" };

/** Floor 2 — The Observatory (CFO Analytics).
 *
 * Skyline + window mullions paint immediately; analytics stream into the
 * Suspense boundary so a slow stats query never delays first paint.
 */
export default async function ObservatoryPage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="2">
      <Suspense fallback={null}>
        <ObservatoryData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function ObservatoryData({ userId }: { userId: string }): Promise<JSX.Element> {
  const stats = await getPipelineStatsRest(userId);
  return <ObservatoryClient stats={stats} />;
}

