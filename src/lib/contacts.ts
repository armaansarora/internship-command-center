import { db } from '@/db';
import { contacts } from '@/db/schema';
import type { Contact } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export type WarmthLevel = 'hot' | 'warm' | 'cold';

export interface WarmthInfo {
  level: WarmthLevel;
  score: number;
  daysSince: number;
}

export type ContactWithWarmth = Contact & { warmth: WarmthInfo };

/**
 * Compute relationship warmth using exponential decay.
 * tau = 13 (time constant)
 * hot: <= 7 days, warm: 8-30 days, cold: > 30 days
 * null lastContactedAt => cold with score 0
 */
export function computeWarmth(lastContactedAt: Date | null): WarmthInfo {
  if (!lastContactedAt) {
    return { level: 'cold', score: 0, daysSince: Infinity };
  }

  const daysSince = Math.floor(
    (Date.now() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Exponential decay: e^(-t/tau) where tau = 13
  const score = Math.exp(-daysSince / 13) * 100;

  let level: WarmthLevel;
  if (daysSince <= 7) level = 'hot';
  else if (daysSince <= 30) level = 'warm';
  else level = 'cold';

  return { level, score: Math.round(score), daysSince };
}

/**
 * Fetch all contacts with computed warmth, sorted hot-first.
 */
export async function getContacts(): Promise<ContactWithWarmth[]> {
  const rows = await db.select().from(contacts).all();

  const withWarmth = rows.map((row) => ({
    ...row,
    warmth: computeWarmth(row.lastContactedAt),
  }));

  // Sort: hot first, then warm, then cold; within same level sort by score descending
  const levelOrder: Record<WarmthLevel, number> = { hot: 0, warm: 1, cold: 2 };
  withWarmth.sort((a, b) => {
    const levelDiff = levelOrder[a.warmth.level] - levelOrder[b.warmth.level];
    if (levelDiff !== 0) return levelDiff;
    return b.warmth.score - a.warmth.score;
  });

  return withWarmth;
}

/**
 * Fetch contacts matching a company name (case-insensitive).
 */
export async function getContactsByCompany(company: string): Promise<ContactWithWarmth[]> {
  const rows = await db
    .select()
    .from(contacts)
    .where(sql`LOWER(${contacts.company}) = LOWER(${company})`)
    .all();

  return rows.map((row) => ({
    ...row,
    warmth: computeWarmth(row.lastContactedAt),
  }));
}

/**
 * Fetch a single contact by ID.
 */
export async function getContactById(id: number): Promise<ContactWithWarmth | null> {
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .all();

  if (rows.length === 0) return null;

  return {
    ...rows[0],
    warmth: computeWarmth(rows[0].lastContactedAt),
  };
}
