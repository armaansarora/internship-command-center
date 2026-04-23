import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { SituationRoomClient } from "@/components/floor-4/SituationRoomClient";
import { getDailyBriefingData } from "@/lib/db/queries/communications-rest";
import type { Application } from "@/db/schema";
import { approveOutreachAction } from "@/lib/actions/outreach";
import { dismissNotificationAction } from "@/lib/actions/notifications";

export const metadata: Metadata = { title: "The Situation Room | The Tower" };

/** Floor 4 — Follow-ups / Calendar / Deadlines.
 *
 * Skyline + chrome paint immediately; deadlines + briefing data stream into
 * the Suspense boundary so the floor's atmosphere appears before the data.
 */
export default async function SituationRoomPage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="4">
      <Suspense fallback={null}>
        <SituationRoomData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function SituationRoomData({
  userId,
}: {
  userId: string;
}): Promise<JSX.Element> {
  const supabase = await createClient();

  // Fetch applications, briefing data, and outstanding conflicts in parallel
  const [applicationsResult, briefingData, conflictsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("last_activity_at", { ascending: true, nullsFirst: true }),
    getDailyBriefingData(userId),
    supabase
      .from("notifications")
      .select("id, body, source_entity_id, created_at")
      .eq("user_id", userId)
      .eq("type", "calendar_conflict")
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const conflicts = (conflictsResult.data ?? []).map((row) => ({
    id: row.id as string,
    body: (row.body as string | null) ?? "",
    pairId: (row.source_entity_id as string | null) ?? "",
    createdAt: row.created_at as string,
  }));

  // Map snake_case DB rows to camelCase Application type
  const mappedApplications: Application[] = (
    applicationsResult.data ?? []
  ).map((row) => ({
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
    lastActivityAt: row.last_activity_at
      ? new Date(row.last_activity_at)
      : null,
    matchScore: row.match_score ?? null,
    deadlineAt: row.deadline_at ? new Date(row.deadline_at) : null,
    deadlineAlertsSent: row.deadline_alerts_sent ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  return (
    <SituationRoomClient
      briefingData={briefingData}
      applications={mappedApplications}
      approveOutreach={approveOutreachAction}
      dismissNotification={dismissNotificationAction}
      conflicts={conflicts}
    />
  );
}

