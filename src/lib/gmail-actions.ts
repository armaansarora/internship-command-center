'use server';

import { db } from '@/db';
import { applications } from '@/db/schema';
import { getUnreadApplicationEmails, sendEmail } from '@/lib/gmail';
import type { CompanyEmails } from '@/lib/gmail';
import { revalidatePath } from 'next/cache';

/**
 * Server action to fetch unread emails matched to tracked companies.
 * Returns empty array on any failure for graceful degradation.
 */
export async function fetchUnreadEmails(): Promise<CompanyEmails[]> {
  try {
    // Get distinct company names from applications table
    const rows = await db
      .select({ company: applications.company })
      .from(applications)
      .all();

    const uniqueCompanies = [...new Set(rows.map((r) => r.company))];

    if (uniqueCompanies.length === 0) return [];

    return await getUnreadApplicationEmails(uniqueCompanies);
  } catch {
    return [];
  }
}

/**
 * Server action to send a follow-up email via Gmail API.
 * Revalidates application paths on success so email thread updates.
 */
export async function sendFollowUpEmail(
  company: string,
  role: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: true } | { error: string }> {
  try {
    const result = await sendEmail(to, subject, body);

    if (!result.success) {
      return { error: result.error };
    }

    // Revalidate to reflect sent email in thread and activity
    revalidatePath('/applications');
    revalidatePath('/');

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
}
