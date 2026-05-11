import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { createClient, requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { ObservatoryClient } from "@/components/floor-2/ObservatoryClient";
import type { ApplicationInput, Status } from "@/lib/orrery/types";
import { log } from "@/lib/logger";

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
  // fetch the two server-shaped inputs the client wraps:
  //   • PipelineStats — drives the chart grid + CFO whiteboard mini-funnel
  //   • ApplicationInput[] — feeds the Orrery (the centerpiece per partner brief)
  // Both run in parallel; failures degrade gracefully (stats returns empty,
  // orrery query returns []), they never block the floor from rendering.
  const [stats, apps] = await Promise.all([
    getPipelineStatsRest(userId),
    getApplicationsForOrrery(userId),
  ]);
  return <ObservatoryClient stats={stats} apps={apps} />;
}

/**
 * Fetch the user's applications and project them to the orrery's input shape.
 *
 * `hasOfferEverFired` is per-USER, not per-application — it's the supernova-once
 * gate from R9.1. Because the same query already returns every row's status,
 * we derive the flag in-memory rather than firing a second `head:count` REST
 * round-trip. Saves one Supabase hop on every Observatory floor render.
 * "Accepted" is the proxy for a real offer experience (one-way door).
 */
async function getApplicationsForOrrery(userId: string): Promise<ApplicationInput[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("applications")
    .select("id, company_name, role, tier, status, match_score, applied_at, last_activity_at")
    .eq("user_id", userId);

  if (error) {
    log.error("observatory.orrery_apps_fetch_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }

  const applications = rows ?? [];
  const hasOfferEverFired = applications.some(
    (row) => row.status === "accepted",
  );

  return applications.map((row): ApplicationInput => ({
    id: String(row.id),
    companyName: row.company_name ?? "Unknown",
    role: row.role ?? "",
    tier: typeof row.tier === "number" ? row.tier : null,
    status: (row.status ?? "discovered") as Status,
    matchScore: row.match_score == null ? null : Number(row.match_score),
    appliedAt: row.applied_at ?? null,
    lastActivityAt: row.last_activity_at ?? null,
    hasOfferEverFired,
  }));
}

