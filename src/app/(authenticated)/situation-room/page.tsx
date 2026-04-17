import type { Metadata } from "next";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { SituationRoomClient } from "@/components/floor-4/SituationRoomClient";
import { getDailyBriefingData } from "@/lib/db/queries/communications-rest";
import type { Application } from "@/db/schema";
import { approveOutreachAction } from "@/lib/actions/outreach";
import { dismissNotificationAction } from "@/lib/actions/notifications";

export const metadata: Metadata = { title: "The Situation Room | The Tower" };

/** Floor 4 — Follow-ups / Calendar / Deadlines */
export default async function SituationRoomPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch applications and briefing data in parallel
  const [applicationsResult, briefingData] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: true, nullsFirst: true }),
    getDailyBriefingData(user.id),
  ]);

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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  return (
    <FloorShell floorId="4">
      <SituationRoomClient
        briefingData={briefingData}
        applications={mappedApplications}
        approveOutreach={approveOutreachAction}
        dismissNotification={dismissNotificationAction}
      />
    </FloorShell>
  );
}
