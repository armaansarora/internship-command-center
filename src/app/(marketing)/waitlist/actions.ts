"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkInMemoryRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const WaitlistSchema = z.object({
  email: z.string().email().max(254),
  referrer: z.string().max(512).optional(),
  utm: z.string().max(256).optional(),
});

export type WaitlistResult =
  | { ok: true }
  | { ok: false; error: string };

// 5 attempts per minute per normalized email. Pairs with the unique index on
// lower(email) — the limiter blocks new-email floods, and the index dedupes
// retries for legitimate users. IP capture below adds forensic context for
// any spam that does sneak through. Captcha is the obvious next step.
const PER_EMAIL_LIMIT = 5;
const PER_EMAIL_WINDOW_MS = 60_000;

/**
 * Pulls the originating client IP from the request's edge-proxy headers.
 * - `x-forwarded-for` is a comma-separated list; the first hop is the client.
 * - `x-real-ip` is the Vercel/Nginx-style fallback.
 * Returns `null` when neither header is present (e.g., direct origin hit
 * during a test). The DB column is `inet`; a Postgres null is fine.
 */
function extractClientIp(headerList: Headers): string | null {
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const parsed = WaitlistSchema.safeParse({
    email: formData.get("email"),
    referrer: formData.get("referrer") ?? undefined,
    utm: formData.get("utm") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email." };
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  // Per-email throttle — blocks signup spam from the same address. Keyed on the
  // normalized email so case variations all share the same bucket. Per-IP
  // throttling would be the natural pair but masquerades poorly behind shared
  // NATs and CGNATs; we capture the IP onto the row instead so an admin can
  // flag patterns in post.
  const limit = checkInMemoryRateLimit(
    `waitlist:${normalizedEmail}`,
    PER_EMAIL_LIMIT,
    PER_EMAIL_WINDOW_MS,
  );
  if (!limit.success) {
    return { ok: false, error: "Too many requests. Try again in a minute." };
  }

  const headerList = await headers();
  const ipAddress = extractClientIp(headerList);

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("waitlist_signups")
      .insert({
        email: normalizedEmail,
        referrer: parsed.data.referrer ?? null,
        utm: parsed.data.utm ?? null,
        ip_address: ipAddress,
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
