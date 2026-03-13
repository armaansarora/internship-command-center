"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import type { Company } from "@/db/schema";
import { desc, like, eq } from "drizzle-orm";

export async function getCompanies(search?: string): Promise<Company[]> {
  try {
    const query = db.select().from(companies);

    if (search && search.trim()) {
      return await query
        .where(like(companies.name, `%${search.trim()}%`))
        .orderBy(desc(companies.updatedAt));
    }

    return await query.orderBy(desc(companies.updatedAt));
  } catch {
    return [];
  }
}

export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const results = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    return results[0] ?? null;
  } catch {
    return null;
  }
}
