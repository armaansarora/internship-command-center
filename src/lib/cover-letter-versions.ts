'use server';

import { db } from '@/db';
import { coverLetters, type CoverLetter } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Get all cover letters grouped by company name.
 * Returns a Record<string, CoverLetter[]> where keys are company names
 * and values are cover letters sorted by generatedAt desc.
 */
export async function getAllCoverLettersGrouped(): Promise<Record<string, CoverLetter[]>> {
  const all = await db
    .select()
    .from(coverLetters)
    .orderBy(desc(coverLetters.generatedAt))
    .all();

  const grouped: Record<string, CoverLetter[]> = {};
  for (const letter of all) {
    if (!grouped[letter.company]) {
      grouped[letter.company] = [];
    }
    grouped[letter.company].push(letter);
  }

  return grouped;
}

/**
 * Get cover letters for a specific company, sorted by generatedAt desc.
 */
export async function getCoverLettersByCompany(company: string): Promise<CoverLetter[]> {
  return db
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.company, company))
    .orderBy(desc(coverLetters.generatedAt))
    .all();
}

/**
 * Get cover letters for a specific application.
 */
export async function getCoverLettersByApplication(applicationId: number): Promise<CoverLetter[]> {
  return db
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.applicationId, applicationId))
    .orderBy(desc(coverLetters.generatedAt))
    .all();
}

/**
 * Set a cover letter as active. Uses a transaction to ensure only one
 * cover letter per company is active at a time.
 */
export async function setActiveCoverLetter(id: number): Promise<void> {
  // Find the cover letter to get its company
  const letter = await db
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.id, id))
    .get();

  if (!letter) return;

  // Transaction: deactivate all for this company, then activate the target
  await db.batch([
    db.update(coverLetters)
      .set({ isActive: false })
      .where(eq(coverLetters.company, letter.company)),
    db.update(coverLetters)
      .set({ isActive: true })
      .where(eq(coverLetters.id, id)),
  ]);

  revalidatePath('/cover-letters');
}

/**
 * Get the active cover letter for a company, or null if none is active.
 */
export async function getActiveCoverLetter(company: string): Promise<CoverLetter | null> {
  const result = await db
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.company, company), eq(coverLetters.isActive, true)))
    .get();

  return result ?? null;
}
