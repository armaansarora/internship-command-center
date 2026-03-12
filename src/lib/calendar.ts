import { getGoogleClient } from '@/lib/google';

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  htmlLink: string;
}

/**
 * Fetch upcoming calendar events for the next N days.
 * Returns empty array on any error for graceful degradation.
 */
export async function listUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  try {
    const { calendar } = await getGoogleClient();

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = response.data.items ?? [];

    return items.map((event) => ({
      id: event.id ?? '',
      summary: event.summary ?? '(No title)',
      description: event.description ?? '',
      start: event.start?.dateTime ?? event.start?.date ?? '',
      end: event.end?.dateTime ?? event.end?.date ?? '',
      location: event.location ?? '',
      htmlLink: event.htmlLink ?? '',
    }));
  } catch {
    return [];
  }
}

/**
 * Create a Google Calendar event for an interview.
 * Returns success with eventId/htmlLink, or error on failure.
 */
export async function createInterviewEvent(opts: {
  company: string;
  role: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  description?: string;
}): Promise<
  | { success: true; eventId: string; htmlLink: string }
  | { success: false; error: string }
> {
  try {
    const { calendar } = await getGoogleClient();

    const event = {
      summary: `Interview: ${opts.company} - ${opts.role}`,
      description:
        opts.description ??
        `Interview for ${opts.role} position at ${opts.company}`,
      location: opts.location,
      start: {
        dateTime: opts.startDateTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: opts.endDateTime,
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup' as const, minutes: 30 },
          { method: 'email' as const, minutes: 60 },
        ],
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return {
      success: true,
      eventId: res.data.id ?? '',
      htmlLink: res.data.htmlLink ?? '',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create event',
    };
  }
}

/**
 * Create an all-day Google Calendar event for a follow-up reminder.
 * Returns success with eventId/htmlLink, or error on failure.
 */
export async function createFollowUpReminder(opts: {
  company: string;
  role: string;
  dueDate: string;
  note?: string;
}): Promise<
  | { success: true; eventId: string; htmlLink: string }
  | { success: false; error: string }
> {
  try {
    const { calendar } = await getGoogleClient();

    const event = {
      summary: `Follow up: ${opts.company} - ${opts.role}`,
      description:
        opts.note ??
        `Follow up on ${opts.role} application at ${opts.company}`,
      start: { date: opts.dueDate },
      end: { date: opts.dueDate },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup' as const, minutes: 480 }],
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return {
      success: true,
      eventId: res.data.id ?? '',
      htmlLink: res.data.htmlLink ?? '',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create reminder',
    };
  }
}
