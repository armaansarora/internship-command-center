import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/auth/cron";
import { syncGmailForUser } from "@/lib/gmail/sync";
import { syncCalendarEvents } from "@/lib/calendar/sync";

export const maxDuration = 300; // 5 minutes max for cron
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("id")
    .not("google_tokens", "is", null);

  if (profilesError) {
    return NextResponse.json(
      { error: `Failed to query connected users: ${profilesError.message}` },
      { status: 500 }
    );
  }

  const activeUsers = profiles ?? [];
  if (activeUsers.length === 0) {
    return NextResponse.json({
      usersProcessed: 0,
      usersWithGoogleConnected: 0,
      results: [],
      timestamp: new Date().toISOString(),
    });
  }

  const results: Array<{
    userId: string;
    gmailSynced: number;
    calendarSynced: number;
    staleContacts: number;
    errors: string[];
    gmailClassified: number;
    gmailFailed: number;
  }> = [];

  const queue = [...activeUsers];
  const workers = Array.from({ length: Math.min(5, activeUsers.length) }, async () => {
    for (;;) {
      const profile = queue.pop();
      if (!profile) break;

      const userId = profile.id as string;
      const userErrors: string[] = [];
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
        userErrors.push(
          `Gmail sync failed: ${err instanceof Error ? err.message : "unknown"}`
        );
      }

      try {
        calendarSynced = await syncCalendarEvents(userId, { useAdmin: true });
      } catch (err) {
        userErrors.push(
          `Calendar sync failed: ${err instanceof Error ? err.message : "unknown"}`
        );
      }

      try {
        const cutoff = new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { count, error: staleError } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .lt("last_contact_at", cutoff);

        if (staleError) {
          throw staleError;
        }

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

          if (notifError) {
            throw notifError;
          }
        }
      } catch (err) {
        userErrors.push(
          `Stale check failed: ${err instanceof Error ? err.message : "unknown"}`
        );
      }

      results.push({
        userId,
        gmailSynced,
        calendarSynced,
        staleContacts,
        errors: userErrors,
        gmailClassified,
        gmailFailed,
      });
    }
  });

  await Promise.all(workers);

  const totals = results.reduce(
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

  return NextResponse.json({
    usersProcessed: results.length,
    usersWithGoogleConnected: activeUsers.length,
    totals,
    results,
    timestamp: new Date().toISOString(),
  });
}
