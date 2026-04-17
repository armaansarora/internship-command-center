"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { dismissNotificationForUser } from "@/lib/db/queries/notifications-mutations";

export async function dismissNotificationAction(notificationId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await dismissNotificationForUser(supabase, user.id, notificationId);
  revalidatePath("/situation-room");
}
