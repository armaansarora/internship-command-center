import type { Metadata } from "next";
import { requireUser, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FloorShell } from "@/components/world/FloorShell";
import { WarRoomClient } from "@/components/floor-7/WarRoomClient";
import type { Application } from "@/db/schema";

export const metadata: Metadata = { title: "The War Room | The Tower" };

/** Floor 7 — Applications Pipeline */
export default async function WarRoomPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch all applications for this user via Supabase REST (works on Vercel)
  const { data: applications, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("War Room query failed:", error.message);
  }

  // Map snake_case DB rows to camelCase Application type
  const mappedApplications: Application[] = (applications ?? []).map((row) => ({
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

  // Server Actions — use Supabase client (REST API) for Vercel compatibility
  async function moveApplication(
    id: string,
    newStatus: string,
    newPosition: string
  ): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();
    await sb
      .from("applications")
      .update({
        status: newStatus,
        position: newPosition,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    revalidatePath("/war-room");
  }

  async function deleteApplication(id: string): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();
    await sb.from("applications").delete().eq("id", id);
    revalidatePath("/war-room");
  }

  async function createApplication(formData: FormData): Promise<void> {
    "use server";
    const sessionUser = await requireUser();
    const sb = await createClient();

    const companyName = (formData.get("companyName") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();
    const url = (formData.get("url") as string)?.trim() || null;
    const status = (formData.get("status") as string) ?? "discovered";
    const source = (formData.get("source") as string)?.trim() || null;
    const location = (formData.get("location") as string)?.trim() || null;
    const salary = (formData.get("salary") as string)?.trim() || null;
    const sector = (formData.get("sector") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const tierStr = formData.get("tier") as string;
    const tier = tierStr ? parseInt(tierStr, 10) : null;

    if (!companyName || !role) return;

    await sb.from("applications").insert({
      user_id: sessionUser.id,
      company_name: companyName,
      role,
      url,
      status,
      source,
      location,
      salary,
      sector,
      notes,
      tier: Number.isNaN(tier ?? NaN) ? null : tier,
      position: `init_${Date.now()}`,
      last_activity_at: new Date().toISOString(),
    });

    revalidatePath("/war-room");
  }

  async function updateApplication(id: string, formData: FormData): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();

    const companyName = (formData.get("companyName") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();
    const url = (formData.get("url") as string)?.trim() || null;
    const status = (formData.get("status") as string) ?? "discovered";
    const source = (formData.get("source") as string)?.trim() || null;
    const location = (formData.get("location") as string)?.trim() || null;
    const salary = (formData.get("salary") as string)?.trim() || null;
    const sector = (formData.get("sector") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const tierStr = formData.get("tier") as string;
    const tier = tierStr ? parseInt(tierStr, 10) : null;

    if (!companyName || !role) return;

    await sb
      .from("applications")
      .update({
        company_name: companyName,
        role,
        url,
        status,
        source,
        location,
        salary,
        sector,
        notes,
        tier: Number.isNaN(tier ?? NaN) ? null : tier,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath("/war-room");
  }

  return (
    <FloorShell floorId="7">
      <div
        data-floor="7"
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "20px 24px",
          gap: "16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Tactical grid background */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(30, 144, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 144, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Page header */}
        <div
          style={{
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
            paddingTop: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              marginBottom: "4px",
            }}
          >
            <h1
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "18px",
                fontWeight: 700,
                color: "#E8F4FD",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              WAR TABLE
            </h1>
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                color: "#1E90FF",
                letterSpacing: "0.12em",
                opacity: 0.8,
              }}
            >
              // PIPELINE OPS
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "12px",
              color: "#4A7A9B",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            Application pipeline. Track, manage, and dominate your internship search.
          </p>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
          <WarRoomClient
            applications={mappedApplications}
            onMoveApplication={moveApplication}
            onDeleteApplication={deleteApplication}
            onCreateApplication={createApplication}
            onUpdateApplication={updateApplication}
          />
        </div>
      </div>
    </FloorShell>
  );
}
