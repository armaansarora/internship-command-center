import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/auth/cron";
import { syncGmailForUser } from "@/lib/gmail/sync";
import { syncCalendarEvents } from "@/lib/calendar/sync";
import { log } from "@/lib/logger";

/**
 * GET /api/cron/sync
 *
 * Fan-out Gmail + Calendar sync for every user with connected Google tokens.
 *
 * Hardening vs. prior implementation:
 *   - CRON_SECRET bearer auth (fail-closed in production).
 *   - Pagination + bounded concurrency so huge user bases stay under the
 *     300-second function budget.
 *   - Per-user failures are isolated — one user's Gmail error does not
 *     abort the others.
 *   - Structured logging of totals and per-user errors for ops visibility.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;
const WORKERS = 5;

interface ConnectedUser {
  id: string;
}

interface SyncResult {
  userId: string;
  gmailSynced: number;
  gmailClassified: number;
  gmailFailed: number;
  calendarSynced: number;
  staleContacts: number;
  errors: string[];
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const allResults: SyncResult[] = [];
  let totalUsers = 0;
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .not("google_tokens", "is", null)
      .range(from, to)
      .order("id", { ascending: true });

    if (error) {
      log.error("cron.sync.fetch_users_failed", error, { page });
      return NextResponse.json(
        { error: `Failed to query connected users: ${error.message}` },
        { status: 500 }
      );
    }

    const batch = (data ?? []) as ConnectedUser[];
    if (batch.length === 0) break;

    const queue = [...batch];
    const workers = Array.from({ length: Math.min(WORKERS, batch.length) }, async () => {
      for (;;) {
        const user = queue.pop();
        if (!user) return;
        const result = await processUser(user.id);
        allResults.push(result);
      }
    });
    await Promise.all(workers);

    totalUsers += batch.length;
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  const totals = allResults.reduce(
    (acc, row) => {
      acc.gmailSynced += row.gmailSynced;
      acc.gmailClassified += row.gmailClassified;
      acc.gmailFailed += row.gmailFailed;
      acc.calendarSynced += row.calendarSynced;
      acc.staleContacts += row.staleContacts;
      return acc;
    },
    {
      gmailSynced: 0,
      gmailClassified: 0,
      gmailFailed: 0,
      calendarSynced: 0,
      staleContacts: 0,
    }
  );

  log.info("cron.sync.complete", {
    usersProcessed: allResults.length,
    usersWithGoogleConnected: totalUsers,
    ...totals,
    errorCount: allResults.reduce((n, r) => n + r.errors.length, 0),
  });

  return NextResponse.json({
    usersProcessed: allResults.length,
    usersWithGoogleConnected: totalUsers,
    totals,
    results: allResults,
    timestamp: new Date().toISOString(),
  });
}

async function processUser(userId: string): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let gmailSynced = 0;
  let gmailClassified = 0;
  let gmailFailed = 0;
  let calendarSynced = 0;
  let staleContacts = 0;

  try {
    const gmailResult = await syncGmailForUser(userId, { useAdmin: true });
    gmailSynced = gmailResult.synced;
    gmailClassified = gmailResult.classified;
    gmailFailed = gmailResult.failed;
  } catch (err) {
    log.error("cron.sync.gmail_failed", err, { userId });
    errors.push(
      `Gmail sync failed: ${err instanceof Error ? err.message : "unknown"}`
    );
  }

  try {
    calendarSynced = await syncCalendarEvents(userId, { useAdmin: true });
  } catch (err) {
    log.error("cron.sync.calendar_failed", err, { userId });
    errors.push(
      `Calendar sync failed: ${err instanceof Error ? err.message : "unknown"}`
    );
  }

  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error: staleError } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lt("last_contact_at", cutoff);

    if (staleError) throw staleError;

    staleContacts = count ?? 0;

    if (staleContacts > 0) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: userId,
        type: "stale_contacts",
        priority: "medium",
        title: "Network Cooling Alert",
        body: `${staleContacts} contact${staleContacts === 1 ? "" : "s"} haven't been touched in 14+ days. Open the Rolodex Lounge to re-engage.`,
        channels: ["in_app"],
        is_read: false,
        is_dismissed: false,
      });
      if (notifError) throw notifError;
    }
  } catch (err) {
    log.error("cron.sync.stale_check_failed", err, { userId });
    errors.push(
      `Stale check failed: ${err instanceof Error ? err.message : "unknown"}`
    );
  }

  return {
    userId,
    gmailSynced,
    gmailClassified,
    gmailFailed,
    calendarSynced,
    staleContacts,
    errors,
  };
}
