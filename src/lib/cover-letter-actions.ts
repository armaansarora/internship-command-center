'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { documents, applications, companies } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { generateCoverLetter } from '@/lib/cover-letter';
import { getCompanyResearch } from '@/lib/research';
import { setActiveCoverLetter } from '@/lib/cover-letter-versions';

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
  const session = await auth();
  if (!session) return { step: 'error', error: 'Unauthorized' };

  try {
    // Research the company
    const research = await getCompanyResearch(company);

    // Generate cover letter
    const result = await generateCoverLetter(company, role, research);

    // Determine next version number
    const appId = applicationId ? String(applicationId) : undefined;
    let nextVersion = 1;

    if (appId) {
      const existing = await db
        .select({ version: documents.version })
        .from(documents)
        .where(
          and(
            eq(documents.type, 'cover_letter'),
            eq(documents.applicationId, appId)
          )
        )
        .orderBy(desc(documents.version))
        .limit(1);

      if (existing.length > 0 && existing[0].version) {
        nextVersion = existing[0].version + 1;
      }
    }

    // Insert into documents table
    const [inserted] = await db
      .insert(documents)
      .values({
        applicationId: appId ?? null,
        type: 'cover_letter',
        title: `Cover Letter: ${company} - ${role} (v${nextVersion})`,
        content: result.content,
        version: nextVersion,
        isActive: true,
        generatedBy: 'anthropic',
      })
      .returning({ id: documents.id });

    revalidatePath('/cover-letters');

    return {
      step: 'done',
      content: result.content,
      coverletterId: inserted.id as unknown as number,
    };
  } catch (err) {
    return {
      step: 'error',
      error: err instanceof Error ? err.message : 'Failed to generate cover letter',
    };
  }
}

export async function setActiveCoverLetterAction(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    await setActiveCoverLetter(id);
    revalidatePath('/cover-letters');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to set active cover letter',
    };
  }
}

export async function getApplicationsForAutocomplete(): Promise<
  { id: number; company: string; role: string; tier: string }[]
> {
  const session = await auth();
  if (!session) return [];

  const rows = await db
    .select({
      id: applications.id,
      role: applications.role,
      tier: applications.tier,
      companyName: companies.name,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .orderBy(desc(applications.createdAt));

  return rows.map((r) => ({
    id: r.id as unknown as number,
    company: r.companyName,
    role: r.role,
    tier: `T${r.tier ?? 4}`,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchResearchAction(company: string): Promise<any> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const research = await getCompanyResearch(company);
    return research;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch research',
    };
  }
}
