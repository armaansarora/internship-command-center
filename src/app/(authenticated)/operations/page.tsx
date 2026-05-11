import type { Metadata } from "next";
import type { JSX } from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/owner";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { env } from "@/lib/env";
import {
  readProductionHealthSummary,
  type ProductionHealthSummary,
} from "@/lib/observability/production-health";
import { OperationsClient } from "@/components/operations/OperationsClient";
import {
  getActivationFunnelCounts,
  getRecentActivationDispatches,
  getActivationCostUsd,
  type ActivationFunnelCounts,
  type RecentActivationDispatch,
  type ActivationCost,
} from "@/lib/db/queries/operations-rest";
import {
  getDailyAiSpendCents,
  getRecentIncidentAlerts,
  type DailyAiSpendReading,
  type IncidentAlertView,
} from "@/lib/db/queries/operations-ops-rest";

export const metadata: Metadata = {
  title: "Operations | The Tower",
  /** Founder-only route. Never indexed; deep links never advertised. */
  robots: { index: false, follow: false },
};

/**
 * `/operations` — Operations Dashboard (Day-1, GTM OpsDashboard).
 *
 * Three layers of defense before the page renders:
 *
 *   1. `getUser()` — must be authenticated. Unauth → redirect to `/lobby`
 *      so the operator can sign in.
 *   2. `isOwner(user.id)` — must be the configured `OWNER_USER_ID` (or in
 *      `OWNER_USER_IDS`). Non-owner authenticated users → `notFound()`,
 *      which renders the standard 404. Indistinguishable from a typo'd
 *      URL: the route never reveals its existence to anyone but the
 *      owner.
 *   3. `GATE_CONFIG.flags.operationsDashboardEnabled()` — env flag.
 *      When off, even the owner gets `notFound()`. Same logic: a
 *      flag-off route should look like it does not exist.
 *
 * The three checks are independent. Leaking the route URL is harmless
 * to a non-owner (404 either way), and flipping the flag off kills the
 * surface even if the owner UUID leaks.
 *
 * The shipped surface is four panels:
 *   - Activation funnel (existing, PR 2)
 *   - Cron health (new — sourced from `cron_runs`, same as watchdog)
 *   - Lighthouse incidents (new — sourced from `incident_alerts`)
 *   - AI spend (new — sourced from `v_daily_ai_spend_cents`)
 *
 * All admin reads use `getSupabaseAdmin()` (service-role) because every
 * source table is REVOKE-locked to anon/authenticated. Drizzle's `db`
 * object is NEVER used at runtime here — the Supabase DB is IPv6-only
 * and the pooler returns "Tenant not found" from Vercel serverless.
 */
export default async function OperationsPage(): Promise<JSX.Element> {
  const user = await getUser();
  if (!user) {
    redirect("/lobby");
  }

  if (!isOwner(user.id)) {
    notFound();
  }

  if (!GATE_CONFIG.flags.operationsDashboardEnabled()) {
    notFound();
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(
    nowMs - 24 * 60 * 60 * 1000,
  ).toISOString();
  const generatedAt = nowIso;

  // Every source table here is REVOKE-locked to anon/authenticated; the
  // service-role admin client is the only client that can read them. The
  // page constructs one and threads it through every reader so cost is a
  // single connection per render.
  const admin = getSupabaseAdmin();
  const capUsd = env().KILL_AI_SPEND_USD;

  const [
    funnel7d,
    funnel24h,
    recent,
    cost7d,
    cost24h,
    cronHealth,
    incidents,
    spend,
  ]: [
    ActivationFunnelCounts,
    ActivationFunnelCounts,
    RecentActivationDispatch[],
    ActivationCost,
    ActivationCost,
    ProductionHealthSummary | null,
    IncidentAlertView[],
    DailyAiSpendReading,
  ] = await Promise.all([
    getActivationFunnelCounts(admin, { sinceIso: sevenDaysAgo }),
    getActivationFunnelCounts(admin, { sinceIso: twentyFourHoursAgo }),
    getRecentActivationDispatches(admin, { limit: 20 }),
    getActivationCostUsd(admin, { sinceIso: sevenDaysAgo }),
    getActivationCostUsd(admin, { sinceIso: twentyFourHoursAgo }),
    // `readProductionHealthSummary` re-checks the owner gate internally
    // and constructs its own admin client; passing the user id is the
    // only contract. Returns null on read failure or non-owner; the
    // CronHealthPanel renders a graceful empty state in both cases.
    readProductionHealthSummary(user.id),
    getRecentIncidentAlerts(admin, { limit: 25 }),
    getDailyAiSpendCents(admin, { capUsd, nowIso }),
  ]);

  return (
    <OperationsClient
      funnel7d={funnel7d}
      funnel24h={funnel24h}
      recentDispatches={recent}
      cost7d={cost7d}
      cost24h={cost24h}
      cron={cronHealth?.cron ?? null}
      incidents={incidents}
      spend={spend}
      generatedAt={generatedAt}
      windows={{ sevenDaysAgo, twentyFourHoursAgo }}
    />
  );
}
