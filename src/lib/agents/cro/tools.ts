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

export async function searchJobs(params: {
  query: string;
  location?: string;
  datePosted?: "today" | "3days" | "week" | "month";
  remoteOnly?: boolean;
  limit?: number;
}) {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("JSEARCH_API_KEY environment variable is not set");
  }

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", params.query);
  url.searchParams.set("date_posted", params.datePosted ?? "week");
  url.searchParams.set("remote_jobs_only", String(params.remoteOnly ?? false));
  url.searchParams.set("num_pages", "1");
  if (params.location) {
    url.searchParams.set("location", params.location);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    throw new Error(`JSearch API error: ${response.status}`);
  }

  const data = await response.json();
  const limit = params.limit ?? 10;

  const jobs = (data.data ?? []).slice(0, limit).map((job: Record<string, unknown>) => ({
    title: job.job_title as string,
    company: job.employer_name as string,
    location: `${job.job_city}, ${job.job_state}`,
    url: job.job_apply_link as string,
    datePosted: job.job_posted_at_datetime_utc as string,
    description: ((job.job_description as string) ?? "").slice(0, 500),
  }));

  return { jobs };
}

export async function lookupAtsJob(params: {
  company: string;
  atsType: "lever" | "greenhouse";
  jobId?: string;
}) {
  const slug = params.company.toLowerCase().replace(/[^a-z0-9]/g, "");

  try {
    if (params.atsType === "lever") {
      const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
      const response = await fetch(url);
      if (!response.ok) return { jobs: [] };

      const data = await response.json();
      const postings = Array.isArray(data) ? data : [data];

      const jobs = postings.slice(0, 20).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        title: p.text as string,
        location: (p.categories as Record<string, unknown>)?.location as string,
        url: p.hostedUrl as string,
        team: (p.categories as Record<string, unknown>)?.team as string,
      }));

      return { jobs };
    } else {
      const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
      const response = await fetch(url);
      if (!response.ok) return { jobs: [] };

      const data = await response.json();
      const listings = (data.jobs ?? []) as Record<string, unknown>[];

      const jobs = listings.slice(0, 20).map((j) => ({
        id: String(j.id),
        title: j.title as string,
        location: (j.location as Record<string, unknown>)?.name as string,
        url: j.absolute_url as string,
        team: ((j.departments as Record<string, unknown>[]) ?? [])[0]?.name as string,
      }));

      return { jobs };
    }
  } catch {
    return { jobs: [] };
  }
}
