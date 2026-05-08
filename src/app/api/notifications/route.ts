import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { jsonPostgrestError } from "@/lib/db/postgrest-error";
import { decodeBriefing } from "@/lib/penthouse/briefing-storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications?unread=true
 * Returns notifications for the authenticated user.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  // Tier A: cheap list-query, 60 rpm.
  const rate = await withRateLimit(user.id, "A");
  if (rate.response) return rate.response;

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
  const notifications = (data ?? []).map((row) => {
    const type = row.type as string | null;
    const body = row.body as string | null;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type,
      priority: row.priority as string | null,
      title: row.title as string | null,
      body: userFacingNotificationBody(type, body),
      sourceAgent: row.source_agent as string | null,
      sourceEntityId: row.source_entity_id as string | null,
      sourceEntityType: row.source_entity_type as string | null,
      channels: row.channels,
      isRead: row.is_read as boolean,
      isDismissed: row.is_dismissed as boolean,
      actions: row.actions,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  });

  return NextResponse.json(
    { data: notifications, error: null },
    { headers: rate.headers },
  );
}

function userFacingNotificationBody(
  type: string | null,
  body: string | null,
): string | null {
  if (!body) return body;
  if (type !== "daily_briefing" && !body.trim().startsWith("[briefing_v2]")) {
    return body;
  }

  const briefing = decodeBriefing(body);
  if (!briefing) return "Your morning report is ready.";
  return briefing.beats.map((beat) => beat.text).join(" ");
}
