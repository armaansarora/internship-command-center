'use server';

import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().min(1, 'Company is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  relationshipType: z.enum(['recruiter', 'referral', 'alumni', 'cold_contact']),
  introducedBy: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export async function createContact(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    company: formData.get('company'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    role: formData.get('role') || undefined,
    relationshipType: formData.get('relationshipType'),
    introducedBy: formData.get('introducedBy') || undefined,
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.insert(contacts).values({
    ...parsed.data,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    role: parsed.data.role || null,
    introducedBy: parsed.data.introducedBy || null,
    notes: parsed.data.notes || null,
    lastContactedAt: new Date(),
  }).run();

  revalidatePath('/contacts');
  return { success: true };
}

export async function updateContact(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number(),
    })
    .merge(contactSchema)
    .safeParse({
      id: formData.get('id'),
      name: formData.get('name'),
      company: formData.get('company'),
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
      role: formData.get('role') || undefined,
      relationshipType: formData.get('relationshipType'),
      introducedBy: formData.get('introducedBy') || undefined,
      notes: formData.get('notes') || undefined,
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { id, ...data } = parsed.data;

  await db.update(contacts)
    .set({
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || null,
      introducedBy: data.introducedBy || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .run();

  revalidatePath('/contacts');
  return { success: true };
}

export async function deleteContact(formData: FormData) {
  const parsed = z
    .object({ id: z.coerce.number() })
    .safeParse({ id: formData.get('id') });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.delete(contacts)
    .where(eq(contacts.id, parsed.data.id))
    .run();

  revalidatePath('/contacts');
  return { success: true };
}

export async function updateLastContacted(formData: FormData) {
  const parsed = z
    .object({ id: z.coerce.number() })
    .safeParse({ id: formData.get('id') });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.update(contacts)
    .set({ lastContactedAt: new Date(), updatedAt: new Date() })
    .where(eq(contacts.id, parsed.data.id))
    .run();

  revalidatePath('/contacts');
  return { success: true };
}
