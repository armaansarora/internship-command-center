import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { PenthouseClient } from "./penthouse-client";
import { fetchPenthouseData } from "./penthouse-data";

export const metadata: Metadata = {
  title: "The Penthouse",
};

/**
 * Floor PH — The Penthouse (Dashboard)
 *
 * Server component: fetches user data + dashboard stats from Supabase.
 * Client component: renders glass-panel dashboard over immersive skyline.
 */
export default async function PenthousePage() {
  const user = await requireUser();

  // Fetch real data from Supabase (gracefully degrades if tables don't exist yet)
  const { stats, pipeline, activity } = await fetchPenthouseData(user.id);

  return (
    <FloorShell floorId="PH">
      <PenthouseClient
        userName={user.user_metadata?.full_name ?? null}
        userEmail={user.email ?? ""}
        stats={stats}
        pipeline={pipeline}
        activity={activity}
      />
    </FloorShell>
  );
}
