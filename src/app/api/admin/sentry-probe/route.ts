import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth/owner";

/**
 * Sentry verify probe. Owner-only.
 *
 * Hitting this route while authenticated as the owner deliberately throws
 * a known error so we can confirm Sentry is capturing in production.
 *
 * Usage:
 *   curl -i https://www.interntower.com/api/admin/sentry-probe \
 *     -H "Cookie: <your auth cookie>"
 *
 * The error message is unique enough to grep for in Sentry. If you don't
 * see "TowerSentryProbe" appear in your Sentry dashboard within ~1 minute,
 * the integration is broken — check NEXT_PUBLIC_SENTRY_DSN, sourcemap
 * upload, and that sentry.{client,server,edge}.config.ts are all loaded.
 *
 * The probe is owner-gated so that no public caller (including a friend who
 * thought they'd "test" it) can spam errors at our quota.
 */
export async function GET() {
  const user = await getUser();
  if (!isOwner(user?.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Throw an Error subclass with a unique name so it's distinguishable in
  // Sentry's grouping. Don't use a plain Error("test") — that's noisy.
  const probe = new Error(
    `TowerSentryProbe — deliberate verification error fired at ${new Date().toISOString()}`,
  );
  probe.name = "TowerSentryProbe";
  throw probe;
}
