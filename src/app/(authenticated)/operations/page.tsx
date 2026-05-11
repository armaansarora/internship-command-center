import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/owner";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { OperationsClient } from "@/components/operations/OperationsClient";
import {
  getActivationFunnelCounts,
  getRecentActivationDispatches,
  getActivationCostUsd,
  type ActivationFunnelCounts,
  type RecentActivationDispatch,
  type ActivationCost,
} from "@/lib/db/queries/operations-rest";

export const metadata: Metadata = {
  title: "Operations | The Tower",
  /** Founder-only route. Never indexed; deep links never advertised. */
  robots: { index: false, follow: false },
};

/**
 * `/operations` — Activation Funnel Dashboard (PR 2).
 *
 * Three layers of defense before the page renders:
 *
 *   1. `getUser()` — must be authenticated. Unauth → `/lobby`.
 *   2. `isOwner(user.id)` — must be the configured `OWNER_USER_ID`
 *      (or in `OWNER_USER_IDS`). Non-owner authenticated users → 404
 *      via redirect to `/penthouse`, indistinguishable from a normal
 *      "you wandered into the wrong room" bounce.
 *   3. `GATE_CONFIG.flags.operationsDashboardEnabled()` — env flag.
 *      When off, even the owner gets redirected to `/penthouse`.
 *
 * All three checks are independent: leaking the route URL is harmless
 * to a non-owner, and flipping the flag off kills the surface even if
 * the owner UUID leaks.
 */
export default async function OperationsPage(): Promise<JSX.Element> {
  const user = await getUser();
  if (!user) {
    redirect("/lobby");
  }

  if (!isOwner(user.id)) {
    redirect("/penthouse");
  }

  if (!GATE_CONFIG.flags.operationsDashboardEnabled()) {
    redirect("/penthouse");
  }

  const now = new Date();
  const nowMs = now.getTime();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(
    nowMs - 24 * 60 * 60 * 1000,
  ).toISOString();
  const generatedAt = now.toISOString();

  // `engagement_events` is REVOKE-locked to anon/authenticated — only the
  // service-role client can read it. We pass the admin client to every
  // reader so dispatches + applications share the same auth context.
  const admin = getSupabaseAdmin();

  const [funnel7d, funnel24h, recent, cost7d, cost24h]: [
    ActivationFunnelCounts,
    ActivationFunnelCounts,
    RecentActivationDispatch[],
    ActivationCost,
    ActivationCost,
  ] = await Promise.all([
    getActivationFunnelCounts(admin, { sinceIso: sevenDaysAgo }),
    getActivationFunnelCounts(admin, { sinceIso: twentyFourHoursAgo }),
    getRecentActivationDispatches(admin, { limit: 20 }),
    getActivationCostUsd(admin, { sinceIso: sevenDaysAgo }),
    getActivationCostUsd(admin, { sinceIso: twentyFourHoursAgo }),
  ]);

  return (
    <OperationsClient
      funnel7d={funnel7d}
      funnel24h={funnel24h}
      recentDispatches={recent}
      cost7d={cost7d}
      cost24h={cost24h}
      generatedAt={generatedAt}
      windows={{ sevenDaysAgo, twentyFourHoursAgo }}
    />
  );
}
