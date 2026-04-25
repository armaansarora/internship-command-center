"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const WaitlistSchema = z.object({
  email: z.string().email().max(254),
  referrer: z.string().max(512).optional(),
  utm: z.string().max(256).optional(),
});

export type WaitlistResult =
  | { ok: true }
  | { ok: false; error: string };

export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const parsed = WaitlistSchema.safeParse({
    email: formData.get("email"),
    referrer: formData.get("referrer") ?? undefined,
    utm: formData.get("utm") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email." };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("waitlist_signups")
      .insert({
        email: parsed.data.email.toLowerCase().trim(),
        referrer: parsed.data.referrer ?? null,
        utm: parsed.data.utm ?? null,
      });

    if (error) {
      // Unique constraint violation — already on the list. Treat as success;
      // we don't want to leak whether an email is already in the system.
      if (error.code === "23505") {
        return { ok: true };
      }
      log.error("waitlist.insert_failed", { code: error.code });
      return { ok: false, error: "We couldn't save that just now. Try again in a minute." };
    }

    return { ok: true };
  } catch (err) {
    log.error("waitlist.unexpected", { err: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
