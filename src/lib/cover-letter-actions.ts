'use server';

import { getCompanyResearch } from '@/lib/research';
import { generateCoverLetter } from '@/lib/cover-letter';
import { db } from '@/db';
import { applications, coverLetters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { setActiveCoverLetter } from '@/lib/cover-letter-versions';
import { revalidatePath } from 'next/cache';

export interface GenerationState {
  step: 'idle' | 'researching' | 'generating' | 'done' | 'error';
  content?: string;
  error?: string;
  coverletterId?: number;
}

export async function generateCoverLetterAction(
  company: string,
  role: string,
  applicationId?: number,
): Promise<GenerationState> {
  try {
    // Step 1: Research
    const research = await getCompanyResearch(company);

    // Step 2: Generate
    const result = await generateCoverLetter(company, role, research);

    // Step 3: Auto-save to cover_letters table
    let savedId: number | undefined;
    if (result.content) {
      const inserted = await db
        .insert(coverLetters)
        .values({
          applicationId: applicationId ?? null,
          company,
          role,
          content: result.content,
          isActive: false,
          generatedAt: new Date(),
        })
        .returning({ id: coverLetters.id })
        .get();
      savedId = inserted?.id;
      revalidatePath('/cover-letters');
    }

    return {
      step: 'done',
      content: result.content,
      coverletterId: savedId,
    };
  } catch (e) {
    return {
      step: 'error',
      error: e instanceof Error ? e.message : 'Generation failed',
    };
  }
}

/**
 * Server action to set a cover letter as the active version for its company.
 */
export async function setActiveCoverLetterAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await setActiveCoverLetter(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to set active' };
  }
}

export async function getApplicationsForAutocomplete() {
  return await db
    .select({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      tier: applications.tier,
    })
    .from(applications)
    .all();
}

export async function fetchResearchAction(company: string) {
  try {
    return await getCompanyResearch(company);
  } catch (e) {
    return null;
  }
}
