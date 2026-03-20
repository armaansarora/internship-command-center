/**
 * Communications queries using Supabase REST client.
 * Vercel-compatible — Drizzle direct postgres fails on serverless.
 * Used by COO agent tools for calendar, emails, follow-ups, and outreach.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BriefingData {
  overdueFollowUpsCount: number;
  todaysInterviews: InterviewWithApplication[];
  unreadEmailsCount: number;
  pendingOutreachCount: number;
}

export interface FollowUpItem {
  applicationId: string;
  companyName: string;
  role: string;
  status: string;
  daysSinceActivity: number;
  notes: string | null;
}

export interface InterviewWithApplication {
  id: string;
  applicationId: string;
  companyId: string | null;
  round: string | null;
  format: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  location: string | null;
  interviewerName: string | null;
  status: string;
  calendarEventId: string | null;
  companyName: string | null;
  role: string;
}

export interface EmailItem {
  id: string;
  applicationId: string | null;
  contactId: string | null;
  fromAddress: string;
  toAddress: string | null;
  subject: string | null;
  snippet: string | null;
  classification: string | null;
  urgency: string | null;
  suggestedAction: string | null;
  isRead: boolean;
  isProcessed: boolean;
  receivedAt: string;
}

export interface CalendarEventItem {
  id: string;
  googleEventId: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  interviewId: string | null;
  source: string | null;
}

export interface OutreachQueueItem {
  id: string;
  applicationId: string | null;
  contactId: string | null;
  companyId: string | null;
  type: string;
  subject: string;
  body: string;
  status: string;
  generatedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  resendMessageId: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Raw DB row types
// ---------------------------------------------------------------------------

interface ApplicationRow {
  id: string;
  company_name: string | null;
  role: string;
  status: string;
  last_activity_at: string | null;
  created_at: string;
  notes: string | null;
}

interface InterviewRow {
  id: string;
  application_id: string;
  company_id: string | null;
  round: string | null;
  format: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  interviewer_name: string | null;
  status: string;
  calendar_event_id: string | null;
  // Supabase join returns array when using !inner
  applications: { company_name: string | null; role: string }[] | null;
}

interface EmailRow {
  id: string;
  application_id: string | null;
  contact_id: string | null;
  from_address: string;
  to_address: string | null;
  subject: string | null;
  snippet: string | null;
  classification: string | null;
  urgency: string | null;
  suggested_action: string | null;
  is_read: boolean;
  is_processed: boolean;
  received_at: string;
}

interface CalendarEventRow {
  id: string;
  google_event_id: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  interview_id: string | null;
  source: string | null;
}

interface OutreachRow {
  id: string;
  application_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  type: string;
  subject: string;
  body: string;
  status: string;
  generated_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  resend_message_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FOLLOWUP_OVERDUE_DAYS = 7;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

const ACTIVE_STATUSES = [
  "discovered",
  "applied",
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
  "offer",
];

// ---------------------------------------------------------------------------
// Query 1: getFollowUpsDue
// ---------------------------------------------------------------------------

/**
 * Get all active applications where last_activity_at is more than 7 days ago.
 * Excludes rejected, withdrawn, and accepted applications.
 */
export async function getFollowUpsDue(userId: string): Promise<FollowUpItem[]> {
  const supabase = await createClient();
  const thresholdDate = new Date(
    Date.now() - FOLLOWUP_OVERDUE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("applications")
    .select("id, company_name, role, status, last_activity_at, created_at, notes")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES)
    .lt("last_activity_at", thresholdDate)
    .order("last_activity_at", { ascending: true, nullsFirst: true });

  if (error || !data) {
    return [];
  }

  return (data as ApplicationRow[]).map((row) => ({
    applicationId: row.id,
    companyName: row.company_name ?? "Unknown Company",
    role: row.role,
    status: row.status,
    daysSinceActivity: daysSince(row.last_activity_at ?? row.created_at),
    notes: row.notes,
  }));
}

// ---------------------------------------------------------------------------
// Query 2: getUpcomingInterviews
// ---------------------------------------------------------------------------

/**
 * Get interviews scheduled in the next N days, joined with application info.
 */
export async function getUpcomingInterviews(
  userId: string,
  daysAhead = 7
): Promise<InterviewWithApplication[]> {
  const supabase = await createClient();
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("interviews")
    .select(
      `id, application_id, company_id, round, format, scheduled_at, duration_minutes, location, interviewer_name, status, calendar_event_id,
       applications!inner(company_name, role)`
    )
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", future.toISOString())
    .eq("applications.user_id", userId)
    .order("scheduled_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as InterviewRow[]).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    companyId: row.company_id,
    round: row.round,
    format: row.format,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    location: row.location,
    interviewerName: row.interviewer_name,
    status: row.status,
    calendarEventId: row.calendar_event_id,
    companyName: row.applications?.[0]?.company_name ?? null,
    role: row.applications?.[0]?.role ?? "Unknown Role",
  }));
}

// ---------------------------------------------------------------------------
// Query 3: getRecentEmails
// ---------------------------------------------------------------------------

/**
 * Get recent parsed emails with their classification data.
 */
export async function getRecentEmails(
  userId: string,
  limit = 20
): Promise<EmailItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("emails")
    .select(
      "id, application_id, contact_id, from_address, to_address, subject, snippet, classification, urgency, suggested_action, is_read, is_processed, received_at"
    )
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as EmailRow[]).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    contactId: row.contact_id,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    subject: row.subject,
    snippet: row.snippet,
    classification: row.classification,
    urgency: row.urgency,
    suggestedAction: row.suggested_action,
    isRead: row.is_read,
    isProcessed: row.is_processed,
    receivedAt: row.received_at,
  }));
}

// ---------------------------------------------------------------------------
// Query 4: getCalendarEvents
// ---------------------------------------------------------------------------

/**
 * Get calendar events within a date range.
 */
export async function getCalendarEvents(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<CalendarEventItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, google_event_id, title, description, start_at, end_at, location, interview_id, source"
    )
    .eq("user_id", userId)
    .gte("start_at", fromDate)
    .lte("start_at", toDate)
    .order("start_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as CalendarEventRow[]).map((row) => ({
    id: row.id,
    googleEventId: row.google_event_id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    interviewId: row.interview_id,
    source: row.source,
  }));
}

// ---------------------------------------------------------------------------
// Query 5: getDailyBriefingData
// ---------------------------------------------------------------------------

/**
 * Aggregate stats for the COO daily briefing:
 * overdue follow-ups, today's interviews, unread emails, pending outreach.
 */
export async function getDailyBriefingData(userId: string): Promise<BriefingData> {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const thresholdDate = new Date(
    now.getTime() - FOLLOWUP_OVERDUE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [followUpsResult, interviewsResult, emailsResult, outreachResult] =
    await Promise.all([
      // Overdue follow-ups count
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ACTIVE_STATUSES)
        .lt("last_activity_at", thresholdDate),

      // Today's interviews
      supabase
        .from("interviews")
        .select(
          `id, application_id, company_id, round, format, scheduled_at, duration_minutes, location, interviewer_name, status, calendar_event_id,
           applications!inner(company_name, role)`
        )
        .eq("applications.user_id", userId)
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString())
        .order("scheduled_at", { ascending: true }),

      // Unread emails count
      supabase
        .from("emails")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),

      // Pending outreach count
      supabase
        .from("outreach_queue")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending_approval"),
    ]);

  const todaysInterviews = ((interviewsResult.data ?? []) as InterviewRow[]).map(
    (row) => ({
      id: row.id,
      applicationId: row.application_id,
      companyId: row.company_id,
      round: row.round,
      format: row.format,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      location: row.location,
      interviewerName: row.interviewer_name,
      status: row.status,
      calendarEventId: row.calendar_event_id,
      companyName: row.applications?.[0]?.company_name ?? null,
      role: row.applications?.[0]?.role ?? "Unknown Role",
    })
  );

  return {
    overdueFollowUpsCount: followUpsResult.count ?? 0,
    todaysInterviews,
    unreadEmailsCount: emailsResult.count ?? 0,
    pendingOutreachCount: outreachResult.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Query 6: createOutreachDraft
// ---------------------------------------------------------------------------

/**
 * Insert a new outreach draft into the outreach_queue with status pending_approval.
 */
export async function createOutreachDraft(
  userId: string,
  data: {
    applicationId?: string;
    contactId?: string;
    companyId?: string;
    type: string;
    subject: string;
    body: string;
  }
): Promise<{ success: boolean; outreachId: string | null; message: string }> {
  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("outreach_queue")
    .insert({
      user_id: userId,
      application_id: data.applicationId ?? null,
      contact_id: data.contactId ?? null,
      company_id: data.companyId ?? null,
      type: data.type,
      subject: data.subject,
      body: data.body,
      status: "pending_approval",
      generated_by: "coo-agent",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return {
      success: false,
      outreachId: null,
      message: `Failed to create outreach draft: ${error?.message ?? "unknown error"}`,
    };
  }

  return {
    success: true,
    outreachId: (inserted as { id: string }).id,
    message: "Outreach draft created and queued for approval.",
  };
}

// ---------------------------------------------------------------------------
// Query 7: approveAndSendOutreach
// ---------------------------------------------------------------------------

/**
 * Update outreach queue item status to approved.
 */
export async function approveAndSendOutreach(
  userId: string,
  outreachId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", outreachId)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      message: `Failed to approve outreach: ${error.message}`,
    };
  }

  return {
    success: true,
    message: `Outreach ${outreachId} approved and queued for sending.`,
  };
}

// ---------------------------------------------------------------------------
// Query 8: getOutreachQueue
// ---------------------------------------------------------------------------

/**
 * Get outreach queue items, optionally filtered by status.
 */
export async function getOutreachQueue(
  userId: string,
  status?: string
): Promise<OutreachQueueItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("outreach_queue")
    .select(
      "id, application_id, contact_id, company_id, type, subject, body, status, generated_by, approved_at, sent_at, resend_message_id, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as OutreachRow[]).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    contactId: row.contact_id,
    companyId: row.company_id,
    type: row.type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    generatedBy: row.generated_by,
    approvedAt: row.approved_at,
    sentAt: row.sent_at,
    resendMessageId: row.resend_message_id,
    createdAt: row.created_at,
  }));
}
