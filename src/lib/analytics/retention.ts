/**
 * Retention instrumentation (PR — D1/D7/D30 return tracking).
 *
 * One job: emit a `user_return` engagement event whenever an authenticated
 * user lands on a floor. The dashboard layer (operations) computes D1 / D7 /
 * D30 retention by `count(distinct user_id, date_trunc('day', created_at))
 * where event_type = 'user_return'` against a window — uniqueness is enforced
 * at READ time, so this writer stays append-only and fire-and-forget.
 *
 * Two callsites:
 *
 *   1. Middleware — fires `user_return` alongside the existing `floor_view`
 *      whenever an authenticated request resolves a floor. Source = "direct".
 *
 *   2. Inbound deep links (briefing emails, tube notifications) — can pass a
 *      `return_source` channel hint so the dashboard can split retention by
 *      acquisition channel. Use `RETURN_SOURCES` so the source set is closed
 *      and typos at call sites fail at compile time.
 *
 * Fire-and-forget by contract: never throws, never returns a value. The
 * underlying `recordServerEngagementEvent` already kill-switches on
 * `TOWER_SERVER_ANALYTICS_ENABLED` and swallows its own errors.
 */

import {
  recordServerEngagementEvent,
  type EngagementMetadata,
} from "@/lib/analytics/server-engagement";

/**
 * Closed set of return-source channels. Add a new entry here AND the
 * allowlist in `server-engagement.ts` (it caps the value at 64 chars; the
 * tokens here stay well below that).
 *
 * - "direct"         — user landed via the URL bar / browser bookmark.
 * - "tube"           — pneumatic-tube notification CTA in app.
 * - "briefing_email" — 8am Briefing Room daily email CTA.
 * - "deadline_alert" — Situation Room follow-up reminder.
 * - "referral"       — a `?ref=…` link from another user.
 */
export const RETURN_SOURCES = [
  "direct",
  "tube",
  "briefing_email",
  "deadline_alert",
  "referral",
] as const;
export type ReturnSource = (typeof RETURN_SOURCES)[number];

export interface RecordUserReturnInput {
  userId: string;
  /** Channel attribution. Defaults to "direct". */
  source?: ReturnSource;
  /**
   * First floor segment seen on this return — used by the dashboard to
   * understand "which floor pulled them back". Optional so unattributed
   * deep links (e.g. push notifications) can still emit a return signal.
   */
  floorFirst?: string | null;
  /** Defaults to "/". The middleware passes the real pathname. */
  pathname?: string;
}

/**
 * Fire-and-forget `user_return` writer. Always returns `Promise<void>`;
 * never throws. The middleware calls this as `void recordUserReturn(...)`.
 *
 * Why this matters for GTM: the activation funnel ladder bottoms out at
 * D1 and D7 retention. Without a per-user-per-day return signal, those
 * rows fall back to `floor_view` heuristics that mix prefetches, RSC
 * payloads, and same-session navigations into the numerator. This writer
 * gives the dashboard a clean denominator.
 */
export async function recordUserReturn(
  input: RecordUserReturnInput,
): Promise<void> {
  const metadata: EngagementMetadata = {
    return_source: input.source ?? "direct",
  };
  if (input.floorFirst && input.floorFirst.length > 0) {
    metadata.floor_first = input.floorFirst;
  }

  await recordServerEngagementEvent({
    eventType: "user_return",
    pathname: input.pathname ?? "/",
    userId: input.userId,
    floor: input.floorFirst ?? null,
    metadata,
  });
}
