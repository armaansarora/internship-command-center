import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { PenthouseClient } from "./penthouse-client";
import { fetchPenthouseScene } from "./penthouse-data";

export const metadata: Metadata = {
  title: "The Penthouse",
};

/**
 * Floor PH — The Penthouse.
 *
 * scene-first. The server fetches the user's pre-computed morning
 * briefing + overnight signal + pipeline weather + time-of-day and hands the
 * whole payload to the client, which routes to the right scene for the
 * window.
 *
 * The FloorShell + world chrome remain mounted throughout; only the scene
 * streams into the Suspense boundary, so a slow Supabase round-trip never
 * blocks the floor's first paint.
 */
export default async function PenthousePage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="PH">
      <Suspense fallback={null}>
        <PenthouseSceneShell
          userId={user.id}
          userName={user.user_metadata?.full_name ?? null}
          userEmail={user.email ?? ""}
        />
      </Suspense>
    </FloorShell>
  );
}

async function PenthouseSceneShell({
  userId,
  userName,
  userEmail,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
}): Promise<JSX.Element> {
  const displayName = userName ?? userEmail.split("@")[0] ?? "Analyst";

  const scene = await fetchPenthouseScene({
    id: userId,
    displayName,
    email: userEmail,
  });

  return <PenthouseClient scene={scene} />;
}
