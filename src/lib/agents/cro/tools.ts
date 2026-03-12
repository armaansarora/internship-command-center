import { db } from "@/db";
import { applications, outreachQueue } from "@/db/schema";
import { eq, inArray, gte, and, sql } from "drizzle-orm";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export async function queryApplications(params: {
  status?: string[];
  tier?: number[];
  companyId?: string;
  createdAfter?: string;
  limit?: number;
}) {
  const conditions = [];
  if (params.status?.length)
    conditions.push(inArray(applications.status, params.status as ("discovered" | "applied" | "screening" | "interview_scheduled" | "interviewing" | "under_review" | "offer" | "accepted" | "rejected" | "withdrawn")[]));
  if (params.tier?.length)
    conditions.push(inArray(applications.tier, params.tier));
  if (params.companyId)
    conditions.push(eq(applications.companyId, params.companyId));
  if (params.createdAfter)
    conditions.push(gte(applications.createdAt, params.createdAfter));

  const rows = await db
    .select()
    .from(applications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(params.limit ?? 50);

  return rows;
}

export async function updateApplicationStatus(params: {
  applicationId: string;
  newStatus: string;
  reason: string;
}) {
  await db
    .update(applications)
    .set({
      status: params.newStatus as "discovered" | "applied" | "screening" | "interview_scheduled" | "interviewing" | "under_review" | "offer" | "accepted" | "rejected" | "withdrawn",
      notes: sql`COALESCE(${applications.notes}, '') || char(10) || ${"[CRO " + new Date().toISOString() + "] " + params.reason}`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(applications.id, params.applicationId));

  return {
    success: true,
    applicationId: params.applicationId,
    newStatus: params.newStatus,
  };
}

export async function suggestFollowUp(params: {
  applicationId: string;
  contactId?: string;
  suggestedSubject: string;
  suggestedBody: string;
}) {
  const [draft] = await db
    .insert(outreachQueue)
    .values({
      id: randomHex(),
      applicationId: params.applicationId,
      contactId: params.contactId ?? null,
      type: "follow_up",
      subject: params.suggestedSubject,
      body: params.suggestedBody,
      status: "pending_approval",
      generatedBy: "cro",
      createdAt: new Date().toISOString(),
    })
    .returning();

  return { outreachId: draft!.id, status: "pending_approval" };
}

export async function analyzeConversionRates(params: {
  fromDate?: string;
  toDate?: string;
}) {
  const conditions = [];
  if (params.fromDate)
    conditions.push(gte(applications.createdAt, params.fromDate));

  const rows = await db
    .select()
    .from(applications)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const s = row.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const total = rows.length;
  const stages = [
    "discovered",
    "applied",
    "screening",
    "interview_scheduled",
    "interviewing",
    "under_review",
    "offer",
    "accepted",
  ];
  const conversionRates: Record<string, number> = {};

  for (let i = 0; i < stages.length - 1; i++) {
    const from = byStatus[stages[i]!] ?? 0;
    const to = byStatus[stages[i + 1]!] ?? 0;
    if (from > 0) {
      conversionRates[`${stages[i]} → ${stages[i + 1]}`] = Math.round(
        (to / from) * 100,
      );
    }
  }

  return { totalApplications: total, byStatus, conversionRates };
}
