'use server';

import { auth } from '@/auth';
import { getUnreadApplicationEmails, sendEmail } from '@/lib/gmail';
import { getTrackedCompanyNames } from '@/lib/dashboard';

export type CompanyEmails = {
  company: string;
  emails: { subject: string; from: string; date: string; snippet: string }[];
};

export async function fetchUnreadEmails(): Promise<CompanyEmails[]> {
  const session = await auth();
  if (!session) return [];

  try {
    const companyNames = await getTrackedCompanyNames();
    const results = await getUnreadApplicationEmails(companyNames);

    return results.map((r) => ({
      company: r.company,
      emails: r.emails.map((e) => ({
        subject: e.subject,
        from: e.from,
        date: e.date,
        snippet: e.snippet,
      })),
    }));
  } catch {
    return [];
  }
}

export async function sendFollowUpEmail(
  company: string,
  role: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const result = await sendEmail(to, subject, body);
    if (result.success) {
      return { success: true };
    }
    return { error: result.error };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
}
