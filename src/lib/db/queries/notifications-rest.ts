/**
 * Notifications queries using Supabase REST client.
 * Used by agents and the in-world notification system.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import {
  computeDeliverAfter,
  type QuietHours,
} from "@/lib/notifications/quiet-hours";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string | null;
  priority: "critical" | "high" | "medium" | "low" | null;
  title: string | null;
  body: string | null;
  source_agent: string | null;
  source_entity_id: string | null;
  source_entity_type: string | null;
  channels: unknown;
  is_read: boolean | null;
  is_dismissed: boolean | null;
  actions: unknown;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  type?: string;
  priority?: "critical" | "high" | "medium" | "low";
  title: string;
  body: string;
  sourceAgent?: string;
  sourceEntityId?: string;
  sourceEntityType?: string;
  channels?: string[];
  actions?: Array<{ label: string; url: string }>;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch unread, non-dismissed notifications for a user.
 * Ordered newest first, limit 20.
 */
export async function getUnreadNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    log.error("notifications.get_unread_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }

  return (data ?? []) as NotificationRow[];
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  userId: string,
  id: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    log.error("notifications.mark_read_failed", undefined, {
      userId,
      id,
      error: error.message,
    });
    return { success: false };
  }
  return { success: true };
}

/**
 * Dismiss a notification (hides from feed).
 */
export async function dismissNotification(
  userId: string,
  id: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_dismissed: true, is_read: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    log.error("notifications.dismiss_failed", undefined, {
      userId,
      id,
      error: error.message,
    });
    return { success: false };
  }
  return { success: true };
}

/**
 * Narrow an untyped jsonb value into a {@link QuietHours} shape, or null.
 * Defensive because legacy rows may carry an incomplete payload — a bad
 * shape should degrade to "deliver immediately" rather than crash the
 * agent that's trying to fire a notification.
 */
function parseQuietHours(raw: unknown): QuietHours | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { start?: unknown; end?: unknown };
  if (typeof obj.start !== "string" || typeof obj.end !== "string") return null;
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(obj.start)) return null;
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(obj.end)) return null;
  return { start: obj.start, end: obj.end };
}

/**
 * Create a new notification (called by agents).
 *
 * R7.4 — If the notification targets the pneumatic tube channel, we stamp
 * `deliver_after` at insert time using the user's quiet-hours + timezone
 * preference. The client-side tube hook filters on this column, so the
 * queueing decision happens server-side once, not on every client tick.
 *
 * Partner non-negotiable: a tube queued during quiet hours arrives at
 * wake-up, never at 3am.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; id?: string }> {
  const supabase = await createClient();

  const now = new Date();
  let deliverAfterIso = now.toISOString();

  if (input.channels?.includes("pneumatic_tube")) {
    // Read the user's quiet-hours preference + timezone so we can stamp the
    // right `deliver_after`. A failed read degrades to "deliver immediately"
    // — no quiet-hours profile is a valid state (new account, opted out).
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("quiet_hours, timezone")
      .eq("id", input.userId)
      .maybeSingle();

    if (profileErr) {
      log.warn("notifications.quiet_hours_read_failed", {
        userId: input.userId,
        error: profileErr.message,
      });
    }

    const quietHours =
      profile && typeof profile === "object"
        ? parseQuietHours((profile as { quiet_hours?: unknown }).quiet_hours)
        : null;
    const tz =
      (profile && typeof profile === "object"
        ? ((profile as { timezone?: unknown }).timezone as string | undefined)
        : undefined) ?? "America/New_York";

    deliverAfterIso = computeDeliverAfter({
      now,
      userTimezone: tz,
      quietHours,
    });
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type ?? null,
      priority: input.priority ?? "medium",
      title: input.title,
      body: input.body,
      source_agent: input.sourceAgent ?? null,
      source_entity_id: input.sourceEntityId ?? null,
      source_entity_type: input.sourceEntityType ?? null,
      channels: input.channels ?? null,
      actions: input.actions ?? null,
      is_read: false,
      is_dismissed: false,
      deliver_after: deliverAfterIso,
    })
    .select("id")
    .single();

  if (error) {
    log.error("notifications.create_failed", undefined, {
      userId: input.userId,
      type: input.type ?? null,
      error: error.message,
    });
    return { success: false };
  }

  return { success: true, id: (data as { id: string }).id };
}
