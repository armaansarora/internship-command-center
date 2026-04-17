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
} from "@/lib/actions/applications";
import type { Application } from "@/db/schema";

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

  return (
    <FloorShell floorId="7">
      <Suspense fallback={<WarRoomPlaceholder />}>
        <WarRoomData
          userId={user.id}
          moveApplication={moveApplication}
          deleteApplication={deleteApplication}
          createApplication={createApplication}
          updateApplication={updateApplication}
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
}: {
  userId: string;
  moveApplication: (id: string, newStatus: string, newPosition: string) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  createApplication: (formData: FormData) => Promise<void>;
  updateApplication: (id: string, formData: FormData) => Promise<void>;
}): Promise<JSX.Element> {
  const supabase = await createClient();

  // Fan out — applications grid + pipeline stats can run in parallel.
  const [appsResult, stats] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getPipelineStatsRest(userId),
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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  return (
    <WarRoomClient
      applications={mappedApplications}
      stats={stats}
      onMoveApplication={moveApplication}
      onDeleteApplication={deleteApplication}
      onCreateApplication={createApplication}
      onUpdateApplication={updateApplication}
    />
  );
}

function WarRoomPlaceholder(): JSX.Element {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading war room"
    >
      <div className="flex flex-col items-center gap-4" aria-hidden="true">
        <span className="block w-px h-12 bg-gradient-to-b from-transparent via-[#1E90FF] to-transparent motion-safe:animate-[wr-pulse_1800ms_ease-in-out_infinite]" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#4A7A9B]">
          Drawing the war table
        </span>
      </div>
      <span className="sr-only">Loading war room data…</span>

      <style>{`
        @keyframes wr-pulse {
          0%, 100% { opacity: 0.3; transform: translateY(4px); }
          50%      { opacity: 1;   transform: translateY(-4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
