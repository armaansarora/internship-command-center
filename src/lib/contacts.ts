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
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getContacts(): Promise<ContactWithWarmth[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getContactsByCompany(
  company: string
): Promise<ContactWithWarmth[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getContactById(
  id: number
): Promise<ContactWithWarmth | null> {
  throw new Error("Not implemented — awaiting Phase 1");
}
