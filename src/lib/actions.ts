'use server';

import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { suggestTier, inferSector } from '@/lib/tier-utils';

const statusSchema = z.enum([
  'applied',
  'in_progress',
  'interview',
  'under_review',
  'rejected',
  'offer',
]);

const tierSchema = z.enum(['T1', 'T2', 'T3', 'T4']);
const sectorSchema = z.enum(['RE Finance', 'Real Estate', 'Finance', 'Other']);

export async function updateApplicationStatus(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number(),
      status: statusSchema,
    })
    .safeParse({
      id: formData.get('id'),
      status: formData.get('status'),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.update(applications)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(applications.id, parsed.data.id))
    .run();

  revalidatePath('/applications');
  revalidatePath(`/applications/${parsed.data.id}`);
  return { success: true };
}

export async function updateApplicationTier(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number(),
      tier: tierSchema,
    })
    .safeParse({
      id: formData.get('id'),
      tier: formData.get('tier'),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.update(applications)
    .set({ tier: parsed.data.tier, updatedAt: new Date() })
    .where(eq(applications.id, parsed.data.id))
    .run();

  revalidatePath('/applications');
  revalidatePath(`/applications/${parsed.data.id}`);
  return { success: true };
}

export async function updateApplicationNotes(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number(),
      notes: z.string(),
    })
    .safeParse({
      id: formData.get('id'),
      notes: formData.get('notes'),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.update(applications)
    .set({ notes: parsed.data.notes, updatedAt: new Date() })
    .where(eq(applications.id, parsed.data.id))
    .run();

  revalidatePath('/applications');
  revalidatePath(`/applications/${parsed.data.id}`);
  return { success: true };
}

export async function createApplication(formData: FormData) {
  const parsed = z
    .object({
      company: z.string().min(1, 'Company is required'),
      role: z.string().min(1, 'Role is required'),
      tier: tierSchema.optional(),
      sector: sectorSchema.optional(),
      platform: z.string().optional(),
      notes: z.string().optional(),
    })
    .safeParse({
      company: formData.get('company'),
      role: formData.get('role'),
      tier: formData.get('tier') || undefined,
      sector: formData.get('sector') || undefined,
      platform: formData.get('platform') || undefined,
      notes: formData.get('notes') || undefined,
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const tier = parsed.data.tier || suggestTier(parsed.data.role);
  const sector = parsed.data.sector || inferSector(tier);

  const result = await db
    .insert(applications)
    .values({
      company: parsed.data.company,
      role: parsed.data.role,
      tier,
      sector,
      status: 'applied',
      appliedAt: new Date(),
      platform: parsed.data.platform || null,
      notes: parsed.data.notes || null,
    })
    .run();

  revalidatePath('/applications');
  return { success: true, id: Number(result.lastInsertRowid) };
}
