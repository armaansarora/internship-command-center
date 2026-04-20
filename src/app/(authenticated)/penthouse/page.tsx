import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
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
 *
 * The shell + skyline render immediately; the dashboard stats + pipeline +
 * activity stream into a Suspense boundary so a slow Supabase round-trip never
 * blocks the floor's first paint.
 */
export default async function PenthousePage(): Promise<JSX.Element> {
  // requireUser is React.cache()'d in supabase/server, so this round-trip is
  // shared with the authenticated layout — no duplicate auth fetch.
  const user = await requireUser();

  return (
    <FloorShell floorId="PH">
      <Suspense fallback={null}>
        <PenthouseDataShell
          userId={user.id}
          userName={user.user_metadata?.full_name ?? null}
          userEmail={user.email ?? ""}
        />
      </Suspense>
    </FloorShell>
  );
}

/**
 * Inner async component — performs the (potentially slow) Supabase fetches.
 * Suspends the parent until ready; the FloorShell remains painted throughout.
 */
async function PenthouseDataShell({
  userId,
  userName,
  userEmail,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
}): Promise<JSX.Element> {
  const { stats, pipeline, activity } = await fetchPenthouseData(userId);

  return (
    <PenthouseClient
      userName={userName}
      userEmail={userEmail}
      stats={stats}
      pipeline={pipeline}
      activity={activity}
    />
  );
}
