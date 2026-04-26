import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/db/queries/notifications-rest";
import { computeWarmth } from "@/lib/contacts/warmth";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/warmth-decay
 *
 * Runs daily at 04:00 UTC (vercel.json). For every contact:
 *
 *   1. recompute `warmth` from `last_contact_at` (linear: max(0, 100 - d*2));
 *   2. if this run crosses the contact from above the cold threshold to at-
 *      or-below it, fire ONE idempotent pneumatic-tube notification ("the
 *      relationship is cooling") through the R7 tube.
 *
 * Language is descriptive, never punitive. The cold visual is cool-blue;
 * the copy uses "has gone quiet" / "keep the thread warm", not alerts.
 *
 * Idempotency of the cold alert: `source_entity_id` bucketed by week
 * (`cooling-<contactId>-w<weekBucket>`). Re-running within the same week
 * finds the existing notification row and inserts nothing.
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1).
 */
export const maxDuration = 300;

const COLD_THRESHOLD = 30;
const PAGE_SIZE = 1000;

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date();

  let updated = 0;
  let alerted = 0;
  let fromOffset = 0;

  for (;;) {
    const { data: page, error } = await admin
      .from("contacts")
      .select("id, user_id, name, warmth, last_contact_at")
      .range(fromOffset, fromOffset + PAGE_SIZE - 1);

    if (error) {
      log.error("warmth_decay.read_failed", error, { error: error.message });
      return NextResponse.json(
        { error: `read contacts failed: ${error.message}` },
        { status: 500 },
      );
    }
    if (!page || page.length === 0) break;

    for (const row of page) {
      const last = row.last_contact_at
        ? new Date(row.last_contact_at as string)
        : null;
      const nextWarmth = computeWarmth(last, now);
      const prevWarmth = (row.warmth as number | null) ?? 50;
      if (nextWarmth === prevWarmth) continue;

      const updErr = await admin
        .from("contacts")
        .update({ warmth: nextWarmth })
        .eq("id", row.id as string);

      if (updErr.error) {
        log.warn("warmth_decay.update_failed", {
          contactId: row.id,
          error: updErr.error.message,
        });
        continue;
      }
      updated += 1;

      // Downward crossing of the cold threshold → one alert, bucketed to a
      // week so repeated crossings inside the same week collapse.
      if (prevWarmth > COLD_THRESHOLD && nextWarmth <= COLD_THRESHOLD) {
        const days = last
          ? Math.floor((now.getTime() - last.getTime()) / 86_400_000)
          : 9999;
        const weekBucket = Math.floor(days / 7);
        await createNotification({
          userId: row.user_id as string,
          type: "contact-cooling",
          priority: "low",
          title: "A relationship is cooling",
          body:
            `You haven't spoken to ${(row.name as string) ?? "a contact"} in ` +
            `${days} days. A short note this week keeps the thread warm.`,
          sourceAgent: "cno",
          sourceEntityId: `cooling-${row.id}-w${weekBucket}`,
          sourceEntityType: "contact",
          channels: ["pneumatic_tube"],
        });
        alerted += 1;
      }
    }

    if (page.length < PAGE_SIZE) break;
    fromOffset += PAGE_SIZE;
  }

  return NextResponse.json({ ok: true, updated, alerted });
}

export const GET = withCronHealth("warmth-decay", handle);
