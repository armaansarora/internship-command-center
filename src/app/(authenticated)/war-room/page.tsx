import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { db, schema } from "@/db/index";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { FloorShell } from "@/components/world/FloorShell";
import { WarRoomClient } from "@/components/floor-7/WarRoomClient";
import type { Application } from "@/db/schema";

export const metadata: Metadata = { title: "The War Room | The Tower" };

/** Floor 7 — Applications Pipeline */
export default async function WarRoomPage() {
  const user = await requireUser();

  // Fetch all applications for this user, ordered by position then created
  const applications = await db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.userId, user.id))
    .orderBy(schema.applications.position, desc(schema.applications.createdAt));

  // Server Actions
  async function moveApplication(
    id: string,
    newStatus: string,
    newPosition: string
  ): Promise<void> {
    "use server";
    const sessionUser = await requireUser();
    await db
      .update(schema.applications)
      .set({
        status: newStatus as Application["status"],
        position: newPosition,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        eq(schema.applications.id, id)
      );
    // Verify ownership via RLS — Supabase handles this
    revalidatePath("/war-room");
  }

  async function deleteApplication(id: string): Promise<void> {
    "use server";
    await requireUser();
    await db
      .delete(schema.applications)
      .where(eq(schema.applications.id, id));
    revalidatePath("/war-room");
  }

  async function createApplication(formData: FormData): Promise<void> {
    "use server";
    const sessionUser = await requireUser();

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

    await db.insert(schema.applications).values({
      userId: sessionUser.id,
      companyName,
      role,
      url,
      status: status as Application["status"],
      source,
      location,
      salary,
      sector,
      notes,
      tier: Number.isNaN(tier ?? NaN) ? null : tier,
      position: `init_${Date.now()}`,
      lastActivityAt: new Date(),
    });

    revalidatePath("/war-room");
  }

  async function updateApplication(id: string, formData: FormData): Promise<void> {
    "use server";
    await requireUser();

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

    await db
      .update(schema.applications)
      .set({
        companyName,
        role,
        url,
        status: status as Application["status"],
        source,
        location,
        salary,
        sector,
        notes,
        tier: Number.isNaN(tier ?? NaN) ? null : tier,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, id));

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
            applications={applications}
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
