'use server';

import { auth } from '@/auth';
import { generateInterviewPrep } from '@/lib/interview-prep';
import { revalidatePath } from 'next/cache';

/**
 * Server action to generate interview prep for an application.
 */
export async function generateInterviewPrepAction(
  applicationId: number,
  company: string,
  role: string
): Promise<{ content: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const content = await generateInterviewPrep(company, role, applicationId);
    revalidatePath(`/applications/${applicationId}`);
    return { content };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Failed to generate interview prep',
    };
  }
}

/**
 * Server action to regenerate interview prep.
 * Creates a NEW row (never overwrites previous prep).
 */
export async function regenerateInterviewPrepAction(
  applicationId: number,
  company: string,
  role: string
): Promise<{ content: string } | { error: string }> {
  // Same as generate -- each call creates a new row
  return generateInterviewPrepAction(applicationId, company, role);
}
