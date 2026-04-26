"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { approveOutreachForUser } from "@/lib/db/queries/outreach-mutations";

/**
 * server-action entry point for approving a single outreach row.
 * Stamps the same 30s undo window the /api/outreach/approve route stamps,
 * so callers that approve via a server action (legacy code path) still
 * get the DB-level send_after guard.
 */
const UNDO_WINDOW_SECONDS = 30;

export async function approveOutreachAction(outreachId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const sendAfter = new Date(Date.now() + UNDO_WINDOW_SECONDS * 1000);
  await approveOutreachForUser(supabase, user.id, outreachId, sendAfter);
  revalidatePath("/situation-room");
}
