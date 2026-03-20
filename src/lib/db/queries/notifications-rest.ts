/**
 * Notifications queries using Supabase REST client.
 * Used by agents and the in-world notification system.
 */

import { createClient } from "@/lib/supabase/server";

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
    console.error("getUnreadNotifications failed:", error.message);
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
    console.error("markNotificationRead failed:", error.message);
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
    console.error("dismissNotification failed:", error.message);
    return { success: false };
  }
  return { success: true };
}

/**
 * Create a new notification (called by agents).
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; id?: string }> {
  const supabase = await createClient();

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
      channels: input.channels ? JSON.stringify(input.channels) : null,
      actions: input.actions ? JSON.stringify(input.actions) : null,
      is_read: false,
      is_dismissed: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createNotification failed:", error.message);
    return { success: false };
  }

  return { success: true, id: (data as { id: string }).id };
}
