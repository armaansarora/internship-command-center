import { db } from '@/db';
import { contacts, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type WarmthLevel = 'hot' | 'warm' | 'cold';

export interface WarmthInfo {
  level: WarmthLevel;
  score: number;
  daysSince: number;
}

export type ContactWithWarmth = {
  id: number;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  relationshipType: 'alumni' | 'recruiter' | 'referral' | 'cold_contact' | null;
  introducedBy: number | null;
  notes: string | null;
  lastContactedAt: Date | null;
  warmth: WarmthInfo;
  [key: string]: unknown;
};

export function computeWarmth(lastContactedAt: Date | null): WarmthInfo {
  if (!lastContactedAt) {
    return { level: 'cold', score: 0, daysSince: Infinity };
  }

  const now = new Date();
  const diffMs = now.getTime() - lastContactedAt.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const score = Math.round(100 * Math.exp(-daysSince / 13));
  const level: WarmthLevel = score >= 70 ? 'hot' : score >= 30 ? 'warm' : 'cold';

  return { level, score, daysSince };
}

function mapRowToContact(row: {
  contacts: typeof contacts.$inferSelect;
  companies: typeof companies.$inferSelect | null;
}): ContactWithWarmth {
  const c = row.contacts;
  const lastContactedAt = c.lastContactAt ? new Date(c.lastContactAt) : null;
  const warmth = computeWarmth(lastContactedAt);

  return {
    id: c.id as unknown as number,
    name: c.name,
    company: row.companies?.name ?? '',
    email: c.email ?? null,
    phone: c.phone ?? null,
    role: c.title ?? null,
    relationshipType: (c.relationship as ContactWithWarmth['relationshipType']) ?? null,
    introducedBy: c.introducedBy as unknown as number | null,
    notes: c.notes ?? null,
    lastContactedAt,
    warmth,
  };
}

export async function getContacts(): Promise<ContactWithWarmth[]> {
  const rows = await db
    .select()
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));

  return rows.map(mapRowToContact);
}

export async function getContactsByCompany(
  company: string
): Promise<ContactWithWarmth[]> {
  const rows = await db
    .select()
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.companyId, company));

  return rows.map(mapRowToContact);
}

export async function getContactById(
  id: number
): Promise<ContactWithWarmth | null> {
  const rows = await db
    .select()
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, String(id)));

  if (rows.length === 0) return null;
  return mapRowToContact(rows[0]);
}
