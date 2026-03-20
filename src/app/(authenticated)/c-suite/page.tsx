import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { CSuiteClient } from "@/components/floor-1/CSuiteClient";

export const metadata: Metadata = { title: "The C-Suite | The Tower" };

/** Floor 1 — The C-Suite (CEO Orchestration) */
export default async function CSuitePage() {
  const user = await requireUser();
  const stats = await getPipelineStatsRest(user.id);

  return (
    <FloorShell floorId="1">
      <CSuiteClient stats={stats} />
    </FloorShell>
  );
}
