"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { approveOutreachForUser } from "@/lib/db/queries/outreach-mutations";

export async function approveOutreachAction(outreachId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await approveOutreachForUser(supabase, user.id, outreachId);
  revalidatePath("/situation-room");
}
