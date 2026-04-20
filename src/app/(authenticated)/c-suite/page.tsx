import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { CSuiteClient } from "@/components/floor-1/CSuiteClient";

export const metadata: Metadata = { title: "The C-Suite | The Tower" };

/** Floor 1 — The C-Suite (CEO Orchestration).
 *
 * Skyline paints immediately; CEO orchestration data streams into the
 * Suspense boundary so first paint isn't blocked.
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
  const stats = await getPipelineStatsRest(userId);
  return <CSuiteClient stats={stats} />;
}

