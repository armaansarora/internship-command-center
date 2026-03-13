import { google } from "googleapis";
import { db } from "@/db";
import { emails, applications, calendarEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

async function getGmailClient() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("No Gmail access token");
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

async function getCalendarClient() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("No Calendar access token");
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function fetchRecentEmails(params: {
  maxResults?: number;
  query?: string;
  after?: string;
}) {
  const gmail = await getGmailClient();

  let q = params.query ?? "";
  if (params.after) {
    const epochSeconds = Math.floor(new Date(params.after).getTime() / 1000);
    q += ` after:${epochSeconds}`;
  }

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults: params.maxResults ?? 20,
    q: q.trim() || undefined,
  });

  const messageIds = listRes.data.messages ?? [];
  const results: {
    gmailId: string;
    threadId: string;
    subject: string;
    from: string;
    snippet: string;
    bodyText: string;
    receivedAt: string;
  }[] = [];

  for (const msg of messageIds) {
    if (!msg.id) continue;
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const headers = detail.data.payload?.headers ?? [];
    const subject =
      headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "";
    const from =
      headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
    const dateHeader =
      headers.find((h) => h.name?.toLowerCase() === "date")?.value ?? "";

    // Extract body text from payload
    let bodyText = "";
    const payload = detail.data.payload;
    if (payload?.body?.data) {
      bodyText = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    } else if (payload?.parts) {
      const textPart = payload.parts.find(
        (p) => p.mimeType === "text/plain"
      );
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, "base64url").toString(
          "utf-8"
        );
      }
    }

    results.push({
      gmailId: msg.id,
      threadId: msg.threadId ?? "",
      subject,
      from,
      snippet: detail.data.snippet ?? "",
      bodyText: bodyText.slice(0, 2000),
      receivedAt: dateHeader
        ? new Date(dateHeader).toISOString()
        : new Date().toISOString(),
    });
  }

  return { emails: results };
}

export async function classifyEmail(params: {
  gmailId: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  bodyText: string;
  classification?: string;
  urgency?: string;
  suggestedAction?: string;
  linkedApplicationId?: string;
}) {
  // Check if already processed
  const existing = await db
    .select()
    .from(emails)
    .where(eq(emails.gmailId, params.gmailId))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0]!;
    return {
      classification: row.classification ?? "other",
      urgency: row.urgency ?? "medium",
      suggestedAction: row.suggestedAction ?? null,
      linkedApplicationId: row.applicationId ?? null,
      alreadyProcessed: true,
    };
  }

  // Insert metadata row (no body storage per design decision)
  const classification = (params.classification ?? "pending") as
    | "interview_invite"
    | "rejection"
    | "info_request"
    | "follow_up_needed"
    | "offer"
    | "newsletter"
    | "other";
  const urgency = (params.urgency ?? "medium") as "high" | "medium" | "low";

  await db.insert(emails).values({
    id: randomHex(),
    gmailId: params.gmailId,
    threadId: params.threadId,
    subject: params.subject,
    fromAddress: params.from,
    snippet: params.snippet,
    classification,
    urgency,
    suggestedAction: params.suggestedAction ?? "Awaiting AI classification",
    applicationId: params.linkedApplicationId ?? null,
    isProcessed: true,
    receivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return {
    classification,
    urgency,
    suggestedAction: params.suggestedAction ?? "Awaiting AI classification",
    linkedApplicationId: params.linkedApplicationId ?? null,
    alreadyProcessed: false,
  };
}

export async function createCalendarEvent(params: {
  title: string;
  startAt: string;
  endAt: string;
  description?: string;
  location?: string;
  interviewId?: string;
}) {
  const calendar = await getCalendarClient();

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: params.title,
      description: params.description,
      location: params.location,
      start: { dateTime: params.startAt },
      end: { dateTime: params.endAt },
    },
  });

  const googleEventId = event.data.id ?? randomHex();
  const htmlLink = event.data.htmlLink ?? "";

  // Store reference in local calendar_events table
  await db.insert(calendarEvents).values({
    id: randomHex(),
    googleEventId,
    title: params.title,
    description: params.description ?? null,
    startAt: params.startAt,
    endAt: params.endAt,
    location: params.location ?? null,
    interviewId: params.interviewId ?? null,
    source: "google",
    createdAt: new Date().toISOString(),
  });

  return { googleEventId, htmlLink };
}

export async function updateApplicationFromEmail(params: {
  applicationId: string;
  newStatus: string;
  reason: string;
  emailGmailId: string;
}) {
  // Update application status
  await db
    .update(applications)
    .set({
      status: params.newStatus as
        | "discovered"
        | "applied"
        | "screening"
        | "interview_scheduled"
        | "interviewing"
        | "under_review"
        | "offer"
        | "accepted"
        | "rejected"
        | "withdrawn",
      notes: sql`COALESCE(${applications.notes}, '') || char(10) || ${
        "[COO " + new Date().toISOString() + "] " + params.reason
      }`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(applications.id, params.applicationId));

  // Link email to application
  await db
    .update(emails)
    .set({ applicationId: params.applicationId })
    .where(eq(emails.gmailId, params.emailGmailId));

  return { success: true, applicationId: params.applicationId, newStatus: params.newStatus };
}
