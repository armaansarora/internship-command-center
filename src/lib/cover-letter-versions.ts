'use server';

import { db } from '@/db';
import { documents, applications, companies } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type CoverLetter = {
  id: number;
  company: string;
  role: string;
  content: string;
  isActive: boolean;
  applicationId: number | null;
  generatedAt: Date;
};

function mapRowToCoverLetter(row: {
  documents: typeof documents.$inferSelect;
  applications: typeof applications.$inferSelect | null;
  companies: typeof companies.$inferSelect | null;
}): CoverLetter {
  return {
    id: row.documents.id as unknown as number,
    company: row.companies?.name ?? 'Unknown',
    role: row.applications?.role ?? 'Unknown',
    content: row.documents.content ?? '',
    isActive: row.documents.isActive ?? false,
    applicationId: row.documents.applicationId as unknown as number | null,
    generatedAt: new Date(row.documents.createdAt),
  };
}

export async function getAllCoverLettersGrouped(): Promise<Record<string, CoverLetter[]>> {
  const rows = await db
    .select()
    .from(documents)
    .leftJoin(applications, eq(documents.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(documents.type, 'cover_letter'))
    .orderBy(desc(documents.version));

  const grouped: Record<string, CoverLetter[]> = {};
  for (const row of rows) {
    const cl = mapRowToCoverLetter(row);
    if (!grouped[cl.company]) {
      grouped[cl.company] = [];
    }
    grouped[cl.company].push(cl);
  }
  return grouped;
}

export async function getCoverLettersByCompany(company: string): Promise<CoverLetter[]> {
  const rows = await db
    .select()
    .from(documents)
    .leftJoin(applications, eq(documents.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(and(eq(documents.type, 'cover_letter'), eq(companies.name, company)))
    .orderBy(desc(documents.version));

  return rows.map(mapRowToCoverLetter);
}

export async function getCoverLettersByApplication(applicationId: number): Promise<CoverLetter[]> {
  const rows = await db
    .select()
    .from(documents)
    .leftJoin(applications, eq(documents.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        eq(documents.type, 'cover_letter'),
        eq(documents.applicationId, String(applicationId)),
      ),
    )
    .orderBy(desc(documents.version));

  return rows.map(mapRowToCoverLetter);
}

export async function setActiveCoverLetter(id: number): Promise<void> {
  const docId = String(id);

  await db.transaction(async (tx) => {
    // Find the target document to get its applicationId
    const [target] = await tx
      .select({ applicationId: documents.applicationId })
      .from(documents)
      .where(eq(documents.id, docId));

    if (!target) {
      throw new Error(`Cover letter with id ${id} not found`);
    }

    // Deactivate all cover letters for this application
    if (target.applicationId) {
      await tx
        .update(documents)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(documents.applicationId, target.applicationId),
            eq(documents.type, 'cover_letter'),
          ),
        );
    }

    // Activate the target document
    await tx
      .update(documents)
      .set({ isActive: true, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, docId));
  });
}

export async function getActiveCoverLetter(company: string): Promise<CoverLetter | null> {
  const rows = await db
    .select()
    .from(documents)
    .leftJoin(applications, eq(documents.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        eq(documents.type, 'cover_letter'),
        eq(documents.isActive, true),
        eq(companies.name, company),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  return mapRowToCoverLetter(rows[0]);
}
