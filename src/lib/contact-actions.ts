'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createContact(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  if (!name) return { error: 'Name is required' };

  await db.insert(contacts).values({
    name,
    email: (formData.get('email') as string) || undefined,
    title: (formData.get('title') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    companyId: (formData.get('companyId') as string) || undefined,
    relationship: (formData.get('relationship') as
      | 'alumni'
      | 'recruiter'
      | 'referral'
      | 'cold'
      | 'warm_intro') || undefined,
    linkedinUrl: (formData.get('linkedinUrl') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    introducedBy: (formData.get('introducedBy') as string) || undefined,
    source: 'manual',
  });

  revalidatePath('/contacts');
  return { success: true };
}

export async function updateContact(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Contact ID is required' };

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  const fields = [
    'name',
    'email',
    'title',
    'phone',
    'companyId',
    'relationship',
    'linkedinUrl',
    'notes',
    'introducedBy',
  ] as const;

  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) {
      updates[field] = value as string;
    }
  }

  await db.update(contacts).set(updates).where(eq(contacts.id, id));

  revalidatePath('/contacts');
  return { success: true };
}

export async function deleteContact(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Contact ID is required' };

  await db.delete(contacts).where(eq(contacts.id, id));

  revalidatePath('/contacts');
  return { success: true };
}

export async function updateLastContacted(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Contact ID is required' };

  await db
    .update(contacts)
    .set({
      lastContactAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id));

  revalidatePath('/contacts');
  return { success: true };
}
