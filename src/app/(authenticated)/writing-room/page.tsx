import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { revalidatePath } from "next/cache";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { WritingRoomClient } from "@/components/floor-5/WritingRoomClient";
import type { DocumentStats } from "@/components/floor-5/WritingRoomClient";
import type { Application, Document } from "@/db/schema";

export const metadata: Metadata = { title: "The Writing Room | The Tower" };

/** Floor 5 — Cover Letters + CMO Agent.
 *
 * Skyline paints immediately; documents + applications stream into the
 * Suspense boundary so the floor's chrome is never blocked by a slow query.
 */
export default async function WritingRoomPage(): Promise<JSX.Element> {
  const user = await requireUser();

  // ── Server Actions ─────────────────────────────────────────────────

  async function createDocument(formData: FormData): Promise<void> {
    "use server";
    const sessionUser = await requireUser();
    const sb = await createClient();

    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();
    const applicationId = (formData.get("applicationId") as string)?.trim() || null;
    const companyId = (formData.get("companyId") as string)?.trim() || null;

    if (!title || !content) return;

    await sb.from("documents").insert({
      user_id: sessionUser.id,
      type: "cover_letter",
      title,
      content,
      application_id: applicationId,
      company_id: companyId,
      version: 1,
      is_active: true,
      generated_by: "cmo",
    });

    revalidatePath("/writing-room");
  }

  async function updateDocument(id: string, formData: FormData): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();

    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();

    if (!title || !content) return;

    await sb
      .from("documents")
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath("/writing-room");
  }

  async function deleteDocument(id: string): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();
    await sb.from("documents").delete().eq("id", id);
    revalidatePath("/writing-room");
  }

  return (
    <FloorShell floorId="5">
      <Suspense fallback={null}>
        <WritingRoomData
          userId={user.id}
          createDocument={createDocument}
          updateDocument={updateDocument}
          deleteDocument={deleteDocument}
        />
      </Suspense>
    </FloorShell>
  );
}

async function WritingRoomData({
  userId,
  createDocument,
  updateDocument,
  deleteDocument,
}: {
  userId: string;
  createDocument: (formData: FormData) => Promise<void>;
  updateDocument: (id: string, formData: FormData) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}): Promise<JSX.Element> {
  const supabase = await createClient();

  // Fetch cover letters and applications in parallel
  const [documentsResult, applicationsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "cover_letter")
      .order("updated_at", { ascending: false }),
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  // Map snake_case to camelCase Document type
  const documents: Document[] = (documentsResult.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id,
    companyId: row.company_id,
    type: row.type,
    title: row.title,
    content: row.content,
    version: row.version,
    isActive: row.is_active,
    parentId: row.parent_id,
    generatedBy: row.generated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  // Map snake_case to camelCase Application type
  const applications: Application[] = (applicationsResult.data ?? []).map((row) => ({
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
    deadlineAt: row.deadline_at ? new Date(row.deadline_at) : null,
    deadlineAlertsSent: row.deadline_alerts_sent ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  // Compute document stats
  const coverLetters = documents.filter((d) => d.type === "cover_letter");
  const latestDoc = coverLetters[0] ?? null;
  const appIdsWithLetters = new Set(
    coverLetters.filter((d) => d.applicationId).map((d) => d.applicationId)
  );
  const appsWithoutLetters = applications.filter(
    (a) => !appIdsWithLetters.has(a.id) && a.status !== "rejected" && a.status !== "withdrawn"
  );

  // Find company name for latest doc
  let latestDocCompany: string | null = null;
  if (latestDoc?.applicationId) {
    const app = applications.find((a) => a.id === latestDoc.applicationId);
    latestDocCompany = app?.companyName ?? null;
  }

  const documentStats: DocumentStats = {
    totalDocuments: documents.length,
    coverLetters: coverLetters.length,
    latestDocTitle: latestDoc?.title ?? null,
    latestDocCompany,
    latestDocVersion: latestDoc?.version ?? 0,
    latestDocUpdatedAt: latestDoc?.updatedAt ?? null,
    applicationsWithoutLetters: appsWithoutLetters.length,
  };

  return (
    <WritingRoomClient
      documents={documents}
      applications={applications}
      stats={documentStats}
      onCreateDocument={createDocument}
      onUpdateDocument={updateDocument}
      onDeleteDocument={deleteDocument}
    />
  );
}

