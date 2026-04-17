import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { jsonPostgrestError } from "@/lib/db/postgrest-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications?unread=true
 * Returns notifications for the authenticated user.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const supabase = await createClient();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    return jsonPostgrestError(error);
  }

  // Map snake_case to camelCase
  const notifications = (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string | null,
    priority: row.priority as string | null,
    title: row.title as string | null,
    body: row.body as string | null,
    sourceAgent: row.source_agent as string | null,
    sourceEntityId: row.source_entity_id as string | null,
    sourceEntityType: row.source_entity_type as string | null,
    channels: row.channels,
    isRead: row.is_read as boolean,
    isDismissed: row.is_dismissed as boolean,
    actions: row.actions,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));

  return NextResponse.json({ data: notifications, error: null });
}
