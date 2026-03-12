'use server';

import { db } from '@/db';
import { followUps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createFollowUp(formData: FormData) {
  const parsed = z
    .object({
      applicationId: z.coerce.number(),
      dueAt: z.coerce.date(),
      note: z.string().optional(),
    })
    .safeParse({
      applicationId: formData.get('applicationId'),
      dueAt: formData.get('dueAt'),
      note: formData.get('note') || undefined,
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.insert(followUps)
    .values({
      applicationId: parsed.data.applicationId,
      dueAt: parsed.data.dueAt,
      note: parsed.data.note || null,
    })
    .run();

  revalidatePath('/');
  revalidatePath('/follow-ups');
  return { success: true };
}

export async function dismissFollowUp(formData: FormData) {
  const id = z.coerce.number().safeParse(formData.get('id'));
  if (!id.success) return { error: 'Invalid ID' };

  await db.update(followUps)
    .set({ dismissed: true })
    .where(eq(followUps.id, id.data))
    .run();

  revalidatePath('/');
  revalidatePath('/follow-ups');
  return { success: true };
}

export async function completeFollowUp(formData: FormData) {
  const id = z.coerce.number().safeParse(formData.get('id'));
  if (!id.success) return { error: 'Invalid ID' };

  await db.update(followUps)
    .set({ completedAt: new Date() })
    .where(eq(followUps.id, id.data))
    .run();

  revalidatePath('/');
  revalidatePath('/follow-ups');
  return { success: true };
}

export async function snoozeFollowUp(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number(),
      days: z.coerce.number().min(1).max(30),
    })
    .safeParse({
      id: formData.get('id'),
      days: formData.get('days'),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const newDate = new Date();
  newDate.setDate(newDate.getDate() + parsed.data.days);

  await db.update(followUps)
    .set({ dueAt: newDate })
    .where(eq(followUps.id, parsed.data.id))
    .run();

  revalidatePath('/');
  revalidatePath('/follow-ups');
  return { success: true };
}

export async function updateFollowUpDate(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number(),
      dueAt: z.coerce.date(),
    })
    .safeParse({
      id: formData.get('id'),
      dueAt: formData.get('dueAt'),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.update(followUps)
    .set({ dueAt: parsed.data.dueAt })
    .where(eq(followUps.id, parsed.data.id))
    .run();

  revalidatePath('/');
  revalidatePath('/follow-ups');
  return { success: true };
}
