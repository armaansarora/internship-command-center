/**
 * Unprompted CEO triggers — pure threshold functions.
 *
 * Consumed by `/api/cron/unprompted-ceo` (every 6h). The cron sweeps each
 * active user, fetches their minimal application + recent-ceo-notification
 * set, and runs these functions. Each `TriggerDecision` becomes one
 * notification row (source_agent='ceo'). De-dup for offers happens here
 * (via `existingCeoNotifications`), so the cron can fire-and-forget the
 * inserts without re-checking.
 *
 * Purity requirement: NO DB calls, NO I/O, NO clock reads inside these
 * functions. All time comparisons take an explicit `now: Date` so tests
 * can freeze time deterministically.
 *
 * Thresholds (from the R3.8 plan):
 *   - stale_cluster:    >5 apps in ('applied','screening') with
 *                        last_activity_at < now - 14d, → priority high
 *   - rejection_cluster: >=3 apps with status='rejected' and
 *                        updated_at > now - 7d, → priority medium
 *   - offer_arrived:    per app with status='offer' and
 *                        updated_at > now - 24h, de-duped against any ceo
 *                        notification for the same app in the last 24h,
 *                        → priority critical
 *
 * The "See briefing" action points to floor "1" (C-Suite / CEO's Office)
 * where the user reads the brief and rings the bell for follow-up.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_THRESHOLD_DAYS = 14;
const STALE_MIN_COUNT = 5; // strict > — 6+ apps trigger
const REJECTION_WINDOW_DAYS = 7;
const REJECTION_MIN_COUNT = 3;
const OFFER_WINDOW_HOURS = 24;

export interface MiniApp {
  id: string;
  status: string;
  last_activity_at: string | null;
  updated_at: string;
  created_at: string;
  company_name: string | null;
  role: string;
}

export interface MiniNotification {
  source_agent: string | null;
  source_entity_id: string | null;
  source_entity_type: string | null;
  created_at: string;
}

export interface TriggerDecision {
  type: "stale_cluster" | "rejection_cluster" | "offer_arrived";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  body: string;
  sourceEntityId: string | null;
  sourceEntityType: string | null;
  actions: Array<{ label: string; floor: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function msAgo(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return now.getTime() - t;
}

function describeApp(app: MiniApp): string {
  const company = app.company_name?.trim() || "an unnamed company";
  return `${app.role} at ${company}`;
}

// ---------------------------------------------------------------------------
// shouldFireStaleCluster
// ---------------------------------------------------------------------------

/**
 * Fires when more than 5 applications in early-pipeline stages have been
 * idle for 14+ days. Returns a single decision per sweep — we don't want
 * to spam "pipeline going cold" notifications for the same sweep.
 *
 * Apps with `last_activity_at === null` are excluded by design: a brand-new
 * application that hasn't had a recorded activity event yet isn't "stale,"
 * it's simply un-touched. Sort the qualifying apps by oldest-first so the
 * body surfaces the most egregious offender.
 */
export function shouldFireStaleCluster(
  apps: MiniApp[],
  now: Date,
): TriggerDecision | null {
  const thresholdMs = STALE_THRESHOLD_DAYS * DAY_MS;
  const stale = apps.filter((app) => {
    if (app.status !== "applied" && app.status !== "screening") return false;
    const age = msAgo(app.last_activity_at, now);
    return age !== null && age > thresholdMs;
  });

  if (stale.length <= STALE_MIN_COUNT) return null;

  // Oldest-first: lowest last_activity_at millis. Both sides are guaranteed
  // non-null by the filter above.
  const sorted = [...stale].sort(
    (a, b) =>
      Date.parse(a.last_activity_at as string) -
      Date.parse(b.last_activity_at as string),
  );
  const oldest = sorted[0];

  return {
    type: "stale_cluster",
    priority: "high",
    title: "Pipeline going cold",
    body: `${stale.length} applications have been idle for 14+ days. Oldest: ${describeApp(oldest)}.`,
    sourceEntityId: null,
    sourceEntityType: null,
    actions: [{ label: "See briefing", floor: "1" }],
  };
}

// ---------------------------------------------------------------------------
// shouldFireRejectionCluster
// ---------------------------------------------------------------------------

/**
 * Fires when 3+ rejections landed within the last 7 days. The rejection
 * timestamp is `updated_at` — applications flip to status='rejected' when
 * the rejection email is classified, and we don't record a separate
 * rejected_at column.
 */
export function shouldFireRejectionCluster(
  apps: MiniApp[],
  now: Date,
): TriggerDecision | null {
  const windowMs = REJECTION_WINDOW_DAYS * DAY_MS;
  const recent = apps.filter((app) => {
    if (app.status !== "rejected") return false;
    const age = msAgo(app.updated_at, now);
    return age !== null && age >= 0 && age <= windowMs;
  });

  if (recent.length < REJECTION_MIN_COUNT) return null;

  return {
    type: "rejection_cluster",
    priority: "medium",
    title: `${recent.length} rejections this week — let's regroup`,
    body: `Heads up — ${recent.length} rejections came in over the last 7 days. Want to rework the pitch?`,
    sourceEntityId: null,
    sourceEntityType: null,
    actions: [{ label: "See briefing", floor: "1" }],
  };
}

// ---------------------------------------------------------------------------
// shouldFireOfferArrived
// ---------------------------------------------------------------------------

/**
 * Fires once per new offer (status='offer', updated_at within last 24h),
 * skipping any offer that already has a ceo-authored notification tied to
 * it in the last 24h.
 *
 * Returns an ARRAY — two new offers in the same sweep each deserve their
 * own notification. The critical priority reflects that an offer is the
 * most important event the pipeline can produce.
 */
export function shouldFireOfferArrived(
  apps: MiniApp[],
  existingCeoNotifications: MiniNotification[],
  now: Date,
): TriggerDecision[] {
  const windowMs = OFFER_WINDOW_HOURS * 60 * 60 * 1000;

  const recentOffers = apps.filter((app) => {
    if (app.status !== "offer") return false;
    const age = msAgo(app.updated_at, now);
    return age !== null && age >= 0 && age <= windowMs;
  });

  if (recentOffers.length === 0) return [];

  // Build a Set of application IDs that already have a recent ceo
  // notification. A notification counts if:
  //   - source_agent === 'ceo'
  //   - source_entity_type === 'application'
  //   - source_entity_id === app.id
  //   - created_at > now - 24h
  const notifiedAppIds = new Set<string>();
  for (const notif of existingCeoNotifications) {
    if (notif.source_agent !== "ceo") continue;
    if (notif.source_entity_type !== "application") continue;
    if (!notif.source_entity_id) continue;
    const age = msAgo(notif.created_at, now);
    if (age === null || age < 0 || age > windowMs) continue;
    notifiedAppIds.add(notif.source_entity_id);
  }

  const decisions: TriggerDecision[] = [];
  for (const app of recentOffers) {
    if (notifiedAppIds.has(app.id)) continue;
    const company = app.company_name?.trim() || "an unnamed company";
    decisions.push({
      type: "offer_arrived",
      priority: "critical",
      title: `Offer in from ${company}`,
      body: `An offer just landed for ${app.role} at ${company}. This one's time-sensitive — let's walk the numbers together.`,
      sourceEntityId: app.id,
      sourceEntityType: "application",
      actions: [{ label: "See briefing", floor: "1" }],
    });
  }

  return decisions;
}
