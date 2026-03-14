'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { outreachQueue } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createFollowUp(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const applicationId = formData.get('applicationId') as string;
  const contactId = (formData.get('contactId') as string) || undefined;
  const companyId = (formData.get('companyId') as string) || undefined;
  const subject = (formData.get('subject') as string) || undefined;
  const body = (formData.get('body') as string) || undefined;
  const type = (formData.get('type') as string) || 'follow_up';

  await db.insert(outreachQueue).values({
    applicationId: applicationId || undefined,
    contactId,
    companyId,
    subject,
    body,
    type: type as 'follow_up' | 'cold_email' | 'thank_you' | 'networking' | 'cover_letter_send',
    status: 'pending_approval',
  });

  revalidatePath('/follow-ups');
  return { success: true };
}

export async function dismissFollowUp(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Follow-up ID is required' };

  await db
    .update(outreachQueue)
    .set({ status: 'rejected' })
    .where(eq(outreachQueue.id, id));

  revalidatePath('/follow-ups');
  return { success: true };
}

export async function completeFollowUp(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Follow-up ID is required' };

  await db
    .update(outreachQueue)
    .set({
      status: 'sent',
      sentAt: new Date().toISOString(),
    })
    .where(eq(outreachQueue.id, id));

  revalidatePath('/follow-ups');
  return { success: true };
}

export async function snoozeFollowUp(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Follow-up ID is required' };

  const daysStr = formData.get('days') as string;
  const days = daysStr ? parseInt(daysStr, 10) : 3;

  const futureDate = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  await db
    .update(outreachQueue)
    .set({ createdAt: futureDate })
    .where(eq(outreachQueue.id, id));

  revalidatePath('/follow-ups');
  return { success: true };
}

export async function updateFollowUpDate(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Follow-up ID is required' };

  const date = formData.get('date') as string;
  if (!date) return { error: 'Date is required' };

  await db
    .update(outreachQueue)
    .set({ createdAt: new Date(date).toISOString() })
    .where(eq(outreachQueue.id, id));

  revalidatePath('/follow-ups');
  return { success: true };
}
