"use client";

/**
 * Pneumatic-tube delivery subscriber.
 *
 * Responsibility: surface the right notification rows, exactly once, to the
 * world-level arrival overlay. The tube is not polish — the delivery is
 * Intent-level, and the queue semantics (quiet hours → wake-up) are a
 * partner non-negotiable.
 *
 * Two trigger paths:
 *   1. Supabase realtime channel (`postgres_changes`, INSERT) — fast path
 *      for notifications created while the user is online.
 *   2. 60s sweep timer — catches rows whose `deliver_after` was in the
 *      future at insert time (quiet-hours queueing) and rows missed by a
 *      transient realtime drop.
 *
 * Atomic claim semantics:
 *   Multiple tabs / devices / browser windows can all be subscribed at
 *   once. We enforce single-delivery via UPDATE ... WHERE delivered_at IS
 *   NULL with `.select().single()` — PostgREST returns the updated row only
 *   if the predicate matched, which means we know whether WE won the claim
 *   or some other session beat us to it. No double thunks.
 *
 * This hook never *renders* anything — it just calls `onArrival` per claimed
 * row. The parent overlay component owns the UI.
 */

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Row } from "@/db/database.types";

export interface TubeArrival {
  id: string;
  title: string;
  body: string;
  sourceAgent: string | null;
  actions: Array<{ label: string; url: string }> | null;
}

interface UseTubeDeliveriesOpts {
  onArrival: (notif: TubeArrival) => void;
  enabled?: boolean;
}

const SWEEP_INTERVAL_MS = 60_000;

/**
 * A sweep that claims more than this many rows is a backlog flood (e.g. first
 * dashboard open after days away), not a live delivery moment. The newest few
 * still get the full tube arrival; the rest fold into ONE digest card so the
 * user is never marched through a modal dismissal parade. The sweep paginates
 * until the backlog is fully drained (page cap below), so any backlog size
 * yields at most one digest per sweep — not one per 60s interval. Live
 * realtime inserts arrive one at a time and are unaffected.
 */
const MAX_MODAL_ARRIVALS_PER_SWEEP = 3;
const DIGEST_TITLE_LINES = 6;
const SWEEP_PAGE_SIZE = 20;
const MAX_SWEEP_PAGES = 10; // hard bound: 200 rows per sweep

let digestSeq = 0; // uniqueness across same-millisecond sweeps

/**
 * Row shape we need from `notifications`. Keep lean to minimise payload —
 * we don't need is_read / is_dismissed / timestamps here.
 */
type NotificationQueueRow = Pick<
  Row<"notifications">,
  | "id"
  | "title"
  | "body"
  | "source_agent"
  | "actions"
  | "deliver_after"
  | "delivered_at"
>;

/**
 * Coerce a `jsonb` actions column into our narrow Array shape, or null.
 * Defensive because legacy rows may have a non-array value.
 */
function coerceActions(
  raw: unknown,
): Array<{ label: string; url: string }> | null {
  if (!Array.isArray(raw)) return null;
  const out: Array<{ label: string; url: string }> = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { label?: unknown }).label === "string" &&
      typeof (entry as { url?: unknown }).url === "string"
    ) {
      out.push({
        label: (entry as { label: string }).label,
        url: (entry as { url: string }).url,
      });
    }
  }
  return out.length > 0 ? out : null;
}

/**
 * Attempt to atomically claim one notification row. Returns the claimed
 * arrival on win, null on "someone else got it" or any error.
 */
async function claimNotification(
  sb: SupabaseClient,
  userId: string,
  id: string,
): Promise<TubeArrival | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from("notifications")
    .update({ delivered_at: nowIso })
    .eq("id", id)
    .eq("user_id", userId)
    .is("delivered_at", null)
    .select("id, title, body, source_agent, actions")
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Pick<
    NotificationQueueRow,
    "id" | "title" | "body" | "source_agent" | "actions"
  >;
  return {
    id: row.id,
    title: row.title ?? "",
    body: row.body ?? "",
    sourceAgent: row.source_agent,
    actions: coerceActions(row.actions),
  };
}

/**
 * Pure helper: given a candidate row, decide if we should even try to
 * claim it on this sweep. A row is eligible if `deliver_after` is null
 * (legacy row) or already in the past. Exported so the test can exercise
 * the filter directly without a live Supabase client.
 */
export function isEligibleForSweep(
  row: { deliver_after: string | null; delivered_at: string | null },
  now: Date,
): boolean {
  if (row.delivered_at !== null) return false;
  if (row.deliver_after === null) return true;
  return new Date(row.deliver_after).getTime() <= now.getTime();
}

/**
 * Sweep: fetch the current user's undelivered rows, filter eligible, try
 * to claim each, fire onArrival on wins. Exported for unit testing.
 */
export async function sweepDeliveries(
  sb: SupabaseClient,
  userId: string,
  onArrival: (a: TubeArrival) => void,
  now: Date = new Date(),
): Promise<void> {
  const nowIso = now.toISOString();
  const claimed: TubeArrival[] = [];

  // Paginate until drained: each page's claims stamp delivered_at, so the
  // next identical query returns the NEXT batch of unclaimed rows.
  for (let page = 0; page < MAX_SWEEP_PAGES; page++) {
    const { data, error } = await sb
      .from("notifications")
      .select("id, deliver_after, delivered_at")
      .eq("user_id", userId)
      .is("delivered_at", null)
      .or(`deliver_after.is.null,deliver_after.lte.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(SWEEP_PAGE_SIZE);

    if (error || !data || data.length === 0) break;
    const rows = data as Array<{
      id: string;
      deliver_after: string | null;
      delivered_at: string | null;
    }>;

    let claimedThisPage = 0;
    for (const row of rows) {
      if (!isEligibleForSweep(row, now)) continue;
      const arrival = await claimNotification(sb, userId, row.id);
      if (arrival) {
        claimed.push(arrival);
        claimedThisPage++;
      }
    }

    if (rows.length < SWEEP_PAGE_SIZE) break; // backlog drained
    // Full page but zero wins: every claim lost its race to another session —
    // that session owns the rest. Bail rather than spin on the same rows.
    if (claimedThisPage === 0) break;
  }

  if (claimed.length <= MAX_MODAL_ARRIVALS_PER_SWEEP) {
    for (const arrival of claimed) onArrival(arrival);
    return;
  }

  // Backlog flood: full arrival for the newest few (rows are ordered
  // created_at DESC), one digest card for everything else. Every row was
  // still atomically claimed above, so nothing re-fires on later sweeps.
  const shown = claimed.slice(0, MAX_MODAL_ARRIVALS_PER_SWEEP);
  const rest = claimed.slice(MAX_MODAL_ARRIVALS_PER_SWEEP);
  for (const arrival of shown) onArrival(arrival);

  const listed = rest
    .slice(0, DIGEST_TITLE_LINES)
    .map((a) => `• ${a.title.trim() || "(untitled delivery)"}`)
    .join("\n");
  const overflow =
    rest.length > DIGEST_TITLE_LINES
      ? `\n…and ${rest.length - DIGEST_TITLE_LINES} more`
      : "";
  digestSeq += 1;
  onArrival({
    id: `tube-digest-${now.getTime()}-${digestSeq}`,
    title: `${rest.length} more deliveries while you were away`,
    body: `${listed}${overflow}`,
    sourceAgent: null,
    actions: null,
  });
}

export function useTubeDeliveries(opts: UseTubeDeliveriesOpts): void {
  const { onArrival, enabled = true } = opts;

  // Pin the callback in a ref so we can update it across renders without
  // tearing down the realtime channel + sweep interval.
  const onArrivalRef = useRef(onArrival);
  useEffect(() => {
    onArrivalRef.current = onArrival;
  }, [onArrival]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let sweepTimer: ReturnType<typeof setInterval> | null = null;
    let userId: string | null = null;

    const sb = createClient();

    const trySweep = async () => {
      if (cancelled || !userId) return;
      await sweepDeliveries(sb, userId, (a) => onArrivalRef.current(a));
    };

    const boot = async () => {
      const { data: auth } = await sb.auth.getUser();
      if (cancelled) return;
      const uid = auth.user?.id ?? null;
      if (!uid) return;
      userId = uid;

      // Realtime channel — INSERT events on our notifications rows.
      //
      // The @supabase/realtime-js `on()` overload set is template-literal
      // typed; supplying `"postgres_changes"` directly would force TS to
      // resolve against the wrong overload. Cast once at the call site,
      // not twice through `unknown`, to keep the surface honest.
      channel = sb
        .channel(`tube-deliveries:${uid}`)
        .on(
          "postgres_changes" as never,
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          } as never,
          () => {
            // We don't trust the INSERT payload's deliver_after directly —
            // always go through the sweep so the eligibility check and the
            // atomic claim apply consistently.
            void trySweep();
          },
        )
        .subscribe();

      // Initial sweep — catches rows that became eligible while we were
      // offline (quiet hours ended, rows missed during a prior session).
      void trySweep();

      // Periodic sweep — 60s cadence. The server will have stamped
      // deliver_after already; the sweep just checks "is now >= that?"
      sweepTimer = setInterval(trySweep, SWEEP_INTERVAL_MS);
    };

    void boot();

    return () => {
      cancelled = true;
      if (channel) {
        void sb.removeChannel(channel);
      }
      if (sweepTimer !== null) {
        clearInterval(sweepTimer);
      }
    };
  }, [enabled]);
}
