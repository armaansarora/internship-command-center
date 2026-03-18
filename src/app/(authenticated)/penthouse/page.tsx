import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { PenthouseClient } from "./penthouse-client";

export const metadata: Metadata = {
  title: "The Penthouse",
};

/**
 * Floor PH — The Penthouse (Dashboard)
 *
 * Server component: fetches user data and passes to client dashboard.
 * Client component: renders glass + gold stat cards, pipeline, activity.
 *
 * Note: Real Supabase data queries will be added once the schema
 * migration is pushed (migration-full.sql must run in SQL Editor first).
 */
export default async function PenthousePage() {
  const user = await requireUser();

  return (
    <FloorShell floorId="PH">
      <PenthouseClient
        userName={user.user_metadata?.full_name ?? null}
        userEmail={user.email ?? ""}
      />
    </FloorShell>
  );
}
