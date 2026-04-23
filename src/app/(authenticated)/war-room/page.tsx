import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FloorShell } from "@/components/world/FloorShell";
import { WarRoomClient } from "@/components/floor-7/WarRoomClient";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import {
  createApplicationAction,
  deleteApplicationAction,
  moveApplicationAction,
  updateApplicationAction,
  bulkMoveAction,
} from "@/lib/actions/applications";
import type { Application } from "@/db/schema";
import { getTargetProfile } from "@/lib/agents/cro/target-profile";
import { getTopDiscoveredApplications } from "@/lib/db/queries/job-discovery-rest";
import { getLatestWhiteboardMemory } from "@/lib/db/queries/agent-memory-rest";

export const metadata: Metadata = { title: "The War Room | The Tower" };

/** Floor 7 — Applications Pipeline + CRO Agent.
 *
 * The skyline + window mullions render immediately via FloorShell. The
 * applications grid + pipeline stats stream in via a Suspense boundary so the
 * floor's spatial chrome paints first, then the data settles in.
 */
export default async function WarRoomPage(): Promise<JSX.Element> {
  // requireUser is React.cache()'d — no duplicate auth round-trip even if
  // referenced from server actions inside this module.
  const user = await requireUser();

  // Server Actions — use Supabase client (REST API) for Vercel compatibility
  async function moveApplication(
    id: string,
    newStatus: string,
    newPosition: string
  ): Promise<void> {
    "use server";
    const result = await moveApplicationAction(id, newStatus, newPosition);
    if (result.error) {
      throw new Error(result.error.message);
    }
    revalidatePath("/war-room");
  }

  async function deleteApplication(id: string): Promise<void> {
    "use server";
    const result = await deleteApplicationAction(id);
    if (result.error) {
      throw new Error(result.error.message);
    }
    revalidatePath("/war-room");
  }

  async function createApplication(formData: FormData): Promise<void> {
    "use server";
    const result = await createApplicationAction(formData);
    if (result.error) {
      throw new Error(result.error.message);
    }

    revalidatePath("/war-room");
  }

  async function updateApplication(id: string, formData: FormData): Promise<void> {
    "use server";
    const result = await updateApplicationAction(id, formData);
    if (result.error) {
      throw new Error(result.error.message);
    }

    revalidatePath("/war-room");
  }

  async function stampApplications(
    ids: string[],
    newStatus: string
  ): Promise<void> {
    "use server";
    const result = await bulkMoveAction(ids, newStatus);
    if (result.error) {
      throw new Error(result.error.message);
    }
    revalidatePath("/war-room");
  }

  return (
    <FloorShell floorId="7">
      <Suspense fallback={null}>
        <WarRoomData
          userId={user.id}
          moveApplication={moveApplication}
          deleteApplication={deleteApplication}
          createApplication={createApplication}
          updateApplication={updateApplication}
          stampApplications={stampApplications}
        />
      </Suspense>
    </FloorShell>
  );
}

/**
 * Inner async server component — performs the actual Supabase fetches and
 * lifts them into a Suspense boundary so first paint isn't blocked.
 */
async function WarRoomData({
  userId,
  moveApplication,
  deleteApplication,
  createApplication,
  updateApplication,
  stampApplications,
}: {
  userId: string;
  moveApplication: (id: string, newStatus: string, newPosition: string) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  createApplication: (formData: FormData) => Promise<void>;
  updateApplication: (id: string, formData: FormData) => Promise<void>;
  stampApplications: (ids: string[], newStatus: string) => Promise<void>;
}): Promise<JSX.Element> {
  const supabase = await createClient();

  // Fan out — applications grid + pipeline stats + whiteboard data in parallel.
  const [
    appsResult,
    stats,
    storedProfile,
    topDiscovered,
    latestMemory,
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getPipelineStatsRest(userId),
    getTargetProfile(userId),
    getTopDiscoveredApplications(userId, 3),
    getLatestWhiteboardMemory(userId, "cro"),
  ]);

  if (appsResult.error) {
    // Surface the failure but degrade gracefully — empty grid is better than 500.
    console.error("War Room query failed:", appsResult.error.message);
  }

  // Map snake_case DB rows to camelCase Application type
  const mappedApplications: Application[] = (appsResult.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    role: row.role,
    url: row.url,
    status: row.status,
    tier: row.tier,
    appliedAt: row.applied_at ? new Date(row.applied_at) : null,
    source: row.source,
    notes: row.notes,
    sector: row.sector,
    contactId: row.contact_id,
    salary: row.salary,
    location: row.location,
    position: row.position,
    companyName: row.company_name,
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
    matchScore: row.match_score ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  return (
    <WarRoomClient
      applications={mappedApplications}
      stats={stats}
      whiteboard={{
        targetProfile: storedProfile?.profile ?? null,
        topDiscovered: topDiscovered.map((t) => ({
          role: t.role,
          companyName: t.companyName,
          matchScore: t.matchScore,
          location: t.location,
        })),
        latestMemory,
      }}
      onMoveApplication={moveApplication}
      onDeleteApplication={deleteApplication}
      onCreateApplication={createApplication}
      onUpdateApplication={updateApplication}
      onStampApplications={stampApplications}
    />
  );
}

