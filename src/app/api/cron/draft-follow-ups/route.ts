import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateFollowUpDraft } from "@/lib/ai/structured/follow-up-draft";
import { log } from "@/lib/logger";

/**
 * GET /api/cron/draft-follow-ups
 *
 * Every 2 hours (`0 * /2 * * *`) the COO sweeps across users. For each user
 * whose LOCAL time is inside [02:00, 06:00) we look for stale applications
 * (status in the "active" set, `last_activity_at < now - 7d`), draft an AI
 * follow-up for up to 5 of them, park the drafts as `pending_approval` on
 * `outreach_queue`, and fire ONE batched pneumatic-tube notification per
 * user. The user approves from Floor 4 when they wake up.
 *
 * Idempotency. Because the cron runs every 2h but the window is 4h wide,
 * each user will be hit up to twice per night. The second invocation must
 * create zero new drafts — dedupe against any pending_approval / approved
 * rows already in outreach_queue for the same application. The check
 * intentionally matches across statuses so a user who already approved a
 * draft doesn't get a replacement generated on the next tick.
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1).
 */
export const maxDuration = 300;

const DRAFT_CAP_PER_NIGHT = 5;
const OVERFETCH_MULTIPLIER = 2;
const STALE_DAYS = 7;
const TIME_BUDGET_MS = 250_000;

const ACTIVE_STATUSES = [
  "applied",
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
] as const;

interface UserRow {
  id: string;
  timezone: string | null;
}

interface StaleApp {
  id: string;
  user_id: string;
  company_name: string | null;
  role: string;
  contact_id: string | null;
  last_activity_at: string | null;
}

interface ContactRow {
  id: string;
  name: string | null;
  warmth: number | null;
}

/**
 * Extract the user's local hour (0–23) from a UTC instant using Intl.
 * Returns null if the timezone string is invalid.
 */
function userLocalHour(now: Date, timezone: string | null): number | null {
  if (!timezone) return null;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return null;
    const hour = Number(hourPart.value);
    // Node's Intl formats midnight as "24" in some locales — normalize.
    if (hour === 24) return 0;
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
    return hour;
  } catch {
    return null;
  }
}

function daysSince(iso: string | null, now: Date): number {
  if (!iso) return STALE_DAYS;
  const then = new Date(iso).getTime();
  return Math.max(0, Math.floor((now.getTime() - then) / (24 * 60 * 60 * 1000)));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const now = new Date();
  const admin = getSupabaseAdmin();

  const { data: usersData, error: usersErr } = await admin
    .from("user_profiles")
    .select("id, timezone")
    .is("deleted_at", null);

  if (usersErr) {
    log.error("draft_follow_ups.fetch_users_failed", usersErr, {
      error: usersErr.message,
    });
    return NextResponse.json(
      { error: `fetch users failed: ${usersErr.message}` },
      { status: 500 },
    );
  }

  const users = (usersData ?? []) as UserRow[];
  const staleCutoff = new Date(
    now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let usersSwept = 0;
  let draftsCreated = 0;
  let notificationsCreated = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      log.warn("draft_follow_ups.time_budget_exceeded", {
        processedUsers: usersSwept,
        remainingUsers: users.length - usersSwept,
      });
      break;
    }

    const hour = userLocalHour(now, user.timezone);
    if (hour === null || hour < 2 || hour >= 6) continue;

    usersSwept += 1;

    try {
      const { data: appsData, error: appsErr } = await admin
        .from("applications")
        .select("id, user_id, company_name, role, contact_id, last_activity_at")
        .eq("user_id", user.id)
        .in("status", ACTIVE_STATUSES as unknown as string[])
        .lt("last_activity_at", staleCutoff)
        .order("last_activity_at", { ascending: true })
        .limit(DRAFT_CAP_PER_NIGHT * OVERFETCH_MULTIPLIER);

      if (appsErr) {
        errors.push(`${user.id}: apps fetch — ${appsErr.message}`);
        continue;
      }

      const apps = (appsData ?? []) as StaleApp[];
      if (apps.length === 0) continue;

      // Dedupe against pending_approval / approved rows already in the queue
      // for any of these apps. One round-trip across the candidate set.
      const candidateAppIds = apps.map((a) => a.id);
      const { data: existingRows, error: existingErr } = await admin
        .from("outreach_queue")
        .select("application_id, status")
        .eq("user_id", user.id)
        .in("application_id", candidateAppIds)
        .in("status", ["pending_approval", "approved"]);

      if (existingErr) {
        errors.push(`${user.id}: dedupe fetch — ${existingErr.message}`);
        continue;
      }

      const blockedAppIds = new Set(
        ((existingRows ?? []) as Array<{ application_id: string | null }>)
          .map((r) => r.application_id)
          .filter((x): x is string => typeof x === "string"),
      );

      const eligible = apps
        .filter((a) => !blockedAppIds.has(a.id))
        .slice(0, DRAFT_CAP_PER_NIGHT);

      if (eligible.length === 0) continue;

      // Resolve contacts (where set) in a single round-trip so we can pick a
      // tone hint per draft.
      const contactIds = eligible
        .map((a) => a.contact_id)
        .filter((x): x is string => typeof x === "string");
      const contactMap = new Map<string, ContactRow>();
      if (contactIds.length > 0) {
        const { data: contacts } = await admin
          .from("contacts")
          .select("id, name, warmth")
          .in("id", contactIds);
        for (const c of (contacts ?? []) as ContactRow[]) {
          contactMap.set(c.id, c);
        }
      }

      let userDraftCount = 0;
      for (const app of eligible) {
        const contact = app.contact_id ? contactMap.get(app.contact_id) : undefined;
        try {
          const draft = await generateFollowUpDraft({
            company: app.company_name ?? "the company",
            role: app.role,
            daysSinceActivity: daysSince(app.last_activity_at, now),
            contactName: contact?.name ?? undefined,
            contactWarmth:
              typeof contact?.warmth === "number" ? contact.warmth : undefined,
          });

          const { error: insertErr } = await admin
            .from("outreach_queue")
            .insert({
              user_id: user.id,
              application_id: app.id,
              contact_id: app.contact_id,
              type: "follow_up",
              subject: draft.subject,
              body: draft.body,
              status: "pending_approval",
              generated_by: "coo_overnight",
              metadata: { tone: draft.tone },
            });

          if (insertErr) {
            errors.push(
              `${user.id}/${app.id}: queue insert — ${insertErr.message}`,
            );
            continue;
          }

          userDraftCount += 1;
          draftsCreated += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${user.id}/${app.id}: draft — ${msg}`);
        }
      }

      if (userDraftCount > 0) {
        const { error: notifErr } = await admin.from("notifications").insert({
          user_id: user.id,
          type: "overnight_drafts_ready",
          priority: "medium",
          title: `${userDraftCount} draft${userDraftCount === 1 ? "" : "s"} ready for approval`,
          body: "COO left them on your desk.",
          source_agent: "coo",
          channels: ["pneumatic_tube"],
          actions: [{ label: "Open Situation Room", url: "/situation-room" }],
          is_read: false,
          is_dismissed: false,
        });

        if (notifErr) {
          errors.push(`${user.id}: notif insert — ${notifErr.message}`);
        } else {
          notificationsCreated += 1;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${user.id}: ${msg}`);
      log.warn("draft_follow_ups.user_failed", {
        userId: user.id,
        error: msg,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  log.info("draft_follow_ups.batch_complete", {
    totalUsers: users.length,
    usersSwept,
    draftsCreated,
    notificationsCreated,
    errorCount: errors.length,
    durationMs,
  });

  return NextResponse.json({
    ok: true,
    totalUsers: users.length,
    usersSwept,
    draftsCreated,
    notificationsCreated,
    errors,
    durationMs,
  });
}
