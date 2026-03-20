// Cron sync endpoint — triggered by Vercel Cron or external scheduler.
// Runs inbox scan, calendar sync, and stale contact detection for all active users.
// Protected by CRON_SECRET header to prevent unauthorized triggers.
// Vercel cron config: vercel.json → schedule "0 every-6-hours"

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const maxDuration = 300; // 5 minutes max for cron
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Auth guard — only allow requests with valid CRON_SECRET
// ---------------------------------------------------------------------------

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is set, allow Vercel's internal cron calls
  if (!cronSecret) return true;

  return authHeader === `Bearer ${cronSecret}`;
}

// ---------------------------------------------------------------------------
// GET /api/cron/sync
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Missing Supabase service role credentials" },
      { status: 500 }
    );
  }

  // Use service role client to query all users with connected Gmail
  const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

  // Find users who have Google tokens stored (active Gmail connections)
  const { data: profiles } = await serviceClient
    .from("user_profiles")
    .select("id, google_access_token, google_refresh_token")
    .not("google_refresh_token", "is", null);

  const activeUsers = profiles ?? [];

  const results: Array<{
    userId: string;
    gmailSynced: number;
    calendarSynced: number;
    staleContacts: number;
    errors: string[];
  }> = [];

  for (const profile of activeUsers) {
    const userId = profile.id as string;
    const userErrors: string[] = [];
    let gmailSynced = 0;
    let calendarSynced = 0;
    let staleContacts = 0;

    // 1. Gmail inbox scan
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
      if (baseUrl) {
        const gmailRes = await fetch(
          `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/gmail/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `sb-access-token=service-role`,
            },
          }
        );
        if (gmailRes.ok) {
          const data = (await gmailRes.json()) as { synced: number };
          gmailSynced = data.synced;
        }
      }
    } catch (err) {
      userErrors.push(
        `Gmail sync failed: ${err instanceof Error ? err.message : "unknown"}`
      );
    }

    // 2. Calendar sync
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
      if (baseUrl) {
        const calRes = await fetch(
          `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/calendar/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `sb-access-token=service-role`,
            },
          }
        );
        if (calRes.ok) {
          const data = (await calRes.json()) as { synced: number };
          calendarSynced = data.synced;
        }
      }
    } catch (err) {
      userErrors.push(
        `Calendar sync failed: ${err instanceof Error ? err.message : "unknown"}`
      );
    }

    // 3. Stale contact detection — find contacts not touched in 14+ days
    try {
      const cutoff = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { count } = await serviceClient
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .lt("last_contact_at", cutoff);

      staleContacts = count ?? 0;

      // If there are stale contacts, create a notification
      if (staleContacts > 0) {
        await serviceClient.from("notifications").insert({
          user_id: userId,
          type: "stale_contacts",
          title: "Network Cooling Alert",
          body: `${staleContacts} contact${staleContacts === 1 ? "" : "s"} haven't been touched in 14+ days. Open the Rolodex Lounge to re-engage.`,
          is_read: false,
        });
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
    });
  }

  return NextResponse.json({
    usersProcessed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
