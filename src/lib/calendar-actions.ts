'use server';

import { z } from 'zod/v4';
import { createInterviewEvent, createFollowUpReminder } from '@/lib/calendar';

const interviewSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  duration: z.coerce.number().min(15).max(480).default(60),
  location: z.string().optional(),
});

/**
 * Server action to create a Google Calendar event for an interview.
 */
export async function addInterviewToCalendar(formData: FormData) {
  const parsed = interviewSchema.safeParse({
    company: formData.get('company'),
    role: formData.get('role'),
    date: formData.get('date'),
    time: formData.get('time'),
    duration: formData.get('duration'),
    location: formData.get('location'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { company, role, date, time, duration, location } = parsed.data;

  // Construct ISO datetime strings in America/New_York timezone
  const startDateTime = `${date}T${time}:00`;
  const endDate = new Date(`${date}T${time}:00`);
  endDate.setMinutes(endDate.getMinutes() + duration);
  const endDateTime = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;

  const result = await createInterviewEvent({
    company,
    role,
    startDateTime,
    endDateTime,
    location: location || undefined,
  });

  if (result.success) {
    return { success: true, htmlLink: result.htmlLink };
  }

  return { error: result.error };
}

/**
 * Server action to create a Google Calendar all-day event for a follow-up reminder.
 */
export async function addFollowUpToCalendar(
  company: string,
  role: string,
  dueDate: string,
  note?: string
) {
  const result = await createFollowUpReminder({ company, role, dueDate, note });

  if (result.success) {
    return { success: true, htmlLink: result.htmlLink };
  }

  return { error: result.error };
}
