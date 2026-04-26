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
 * Row shape we need from `notifications`. Keep lean to minimise payload —
 * we don't need is_read / is_dismissed / timestamps here.
 */
interface NotificationQueueRow {
  id: string;
  title: string | null;
  body: string | null;
  source_agent: string | null;
  actions: unknown;
  deliver_after: string | null;
  delivered_at: string | null;
}

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
  const { data, error } = await sb
    .from("notifications")
    .select("id, deliver_after, delivered_at")
    .eq("user_id", userId)
    .is("delivered_at", null)
    .or(`deliver_after.is.null,deliver_after.lte.${nowIso}`)
    .limit(20);

  if (error || !data) return;
  const rows = data as Array<{
    id: string;
    deliver_after: string | null;
    delivered_at: string | null;
  }>;

  for (const row of rows) {
    if (!isEligibleForSweep(row, now)) continue;
    const arrival = await claimNotification(sb, userId, row.id);
    if (arrival) onArrival(arrival);
  }
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
      channel = sb
        .channel(`tube-deliveries:${uid}`)
        .on(
          // The @supabase/realtime-js type for this event is loose
          // (`'postgres_changes' | ...`), so we cast to keep TS honest
          // while still allowing the literal string filter shape.
          "postgres_changes" as unknown as never,
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          } as unknown as never,
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
