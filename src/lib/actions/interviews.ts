"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { createPrepPacketForInterview } from "@/lib/db/queries/interviews-mutations";

export async function createPrepPacketAction(interviewId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await createPrepPacketForInterview(supabase, user.id, interviewId);
  revalidatePath("/briefing-room");
}

export async function exportPacketAction(packetId: string): Promise<void> {
  void packetId;
}

export async function printPacketAction(packetId: string): Promise<void> {
  void packetId;
}
