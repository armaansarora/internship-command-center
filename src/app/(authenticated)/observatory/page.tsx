import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { ObservatoryClient } from "@/components/floor-2/ObservatoryClient";

export const metadata: Metadata = { title: "The Observatory | The Tower" };

/** Floor 2 — The Observatory (CFO Analytics) */
export default async function ObservatoryPage() {
  const user = await requireUser();
  const stats = await getPipelineStatsRest(user.id);

  return (
    <FloorShell floorId="2">
      <ObservatoryClient stats={stats} />
    </FloorShell>
  );
}
