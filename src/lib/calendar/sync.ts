import { createClient } from "@/lib/supabase/server";
import { getGoogleTokens } from "@/lib/gmail/oauth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
}

export interface NewCalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

interface CalendarEventsResponse {
  kind: string;
  summary?: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

// ---------------------------------------------------------------------------
// Fetch events from Google Calendar API
// ---------------------------------------------------------------------------

export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Calendar API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as CalendarEventsResponse;
  return data.items ?? [];
}

// ---------------------------------------------------------------------------
// Full calendar sync: fetch from Google and upsert to DB
// ---------------------------------------------------------------------------

export async function syncCalendarEvents(userId: string): Promise<number> {
  const tokens = await getGoogleTokens(userId);
  const supabase = await createClient();

  const now = new Date();
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ahead

  const events = await fetchCalendarEvents(tokens.access_token, timeMin, timeMax);

  if (events.length === 0) return 0;

  const rows = events.map((event) => ({
    user_id: userId,
    google_event_id: event.id,
    title: event.summary ?? "(No title)",
    description: event.description ?? null,
    start_at: event.start.dateTime ?? event.start.date ?? "",
    end_at: event.end.dateTime ?? event.end.date ?? "",
    location: event.location ?? null,
    source: "google_calendar",
    interview_id: null as string | null,
  }));

  // Upsert deduplicating by google_event_id + user_id
  const { error } = await supabase
    .from("calendar_events")
    .upsert(rows, {
      onConflict: "google_event_id",
      ignoreDuplicates: false,
    });

  if (error) throw new Error(`Failed to upsert calendar events: ${error.message}`);

  return rows.length;
}

// ---------------------------------------------------------------------------
// Create a calendar event via Google Calendar API
// ---------------------------------------------------------------------------

export async function createCalendarEvent(
  accessToken: string,
  event: NewCalendarEvent
): Promise<GoogleCalendarEvent> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create calendar event: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<GoogleCalendarEvent>;
}

// ---------------------------------------------------------------------------
// Get upcoming events from DB
// ---------------------------------------------------------------------------

interface CalendarEventRow {
  id: string;
  google_event_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  interview_id: string | null;
  source: string;
}

export async function getUpcomingEvents(
  userId: string,
  days: number
): Promise<CalendarEventRow[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, google_event_id, title, description, start_at, end_at, location, interview_id, source"
    )
    .eq("user_id", userId)
    .gte("start_at", now)
    .lte("start_at", future)
    .order("start_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch upcoming events: ${error.message}`);

  return (data ?? []) as CalendarEventRow[];
}
