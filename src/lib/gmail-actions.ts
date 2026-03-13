'use server';

export type CompanyEmails = {
  company: string;
  emails: { subject: string; from: string; date: string; snippet: string }[];
};

export async function fetchUnreadEmails(): Promise<CompanyEmails[]> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function sendFollowUpEmail(
  company: string,
  role: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: true } | { error: string }> {
  throw new Error('Not implemented — awaiting Phase 1');
}
