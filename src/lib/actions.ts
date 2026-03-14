'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { applications, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateApplicationStatus(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const id = formData.get('id');
    const status = formData.get('status');

    if (!id || !status) {
      return { error: 'Missing required fields: id and status' };
    }

    await db
      .update(applications)
      .set({ status: status as typeof applications.status.enumValues[number], updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id as string));

    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);

    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update status' };
  }
}

export async function updateApplicationTier(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const id = formData.get('id');
    const tier = formData.get('tier');

    if (!id || tier === null || tier === undefined) {
      return { error: 'Missing required fields: id and tier' };
    }

    await db
      .update(applications)
      .set({ tier: Number(tier), updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id as string));

    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);

    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update tier' };
  }
}

export async function updateApplicationNotes(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const id = formData.get('id');
    const notes = formData.get('notes');

    if (!id) {
      return { error: 'Missing required field: id' };
    }

    await db
      .update(applications)
      .set({ notes: (notes as string) ?? '', updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id as string));

    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);

    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update notes' };
  }
}

export async function createApplication(
  formData: FormData,
): Promise<{ error: string } | { success: true; id: number }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  try {
    const company = formData.get('company') as string | null;
    const role = formData.get('role') as string | null;
    const status = (formData.get('status') as string) || 'applied';
    const tier = formData.get('tier');
    const source = formData.get('source') as string | null;
    const sector = formData.get('sector') as string | null;

    if (!company || !role) {
      return { error: 'Missing required fields: company and role' };
    }

    // Find or create company
    const existing = await db
      .select()
      .from(companies)
      .where(eq(companies.name, company))
      .limit(1);

    let companyId: string;

    if (existing.length > 0) {
      companyId = existing[0].id;
    } else {
      const inserted = await db
        .insert(companies)
        .values({ name: company })
        .returning({ id: companies.id });
      companyId = inserted[0].id;
    }

    // Create application
    const newApp = await db
      .insert(applications)
      .values({
        companyId,
        role,
        status: status as typeof applications.status.enumValues[number],
        tier: tier ? Number(tier) : null,
        source,
        sector,
        appliedAt: new Date().toISOString(),
      })
      .returning({ id: applications.id });

    revalidatePath('/applications');

    // Return type says id: number but actual IDs are text hex strings
    return { success: true, id: newApp[0].id as unknown as number };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create application' };
  }
}
