import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { jsonPostgrestError } from "@/lib/db/postgrest-error";

/**
 * POST /api/notifications/:id/read
 * Marks a single notification as read.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  // Tier A: cheap state flip, 60 rpm.
  const rate = await withRateLimit(user.id, "A");
  if (rate.response) return rate.response;

  const supabase = await createClient();
  const { id } = await params;
  // Validate UUID before touching the DB so a bad path segment can't reach
  // PostgREST and produce a 500 with a leaked Postgres error message.
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return jsonPostgrestError(error);
  }

  return NextResponse.json(
    { data: { success: true }, error: null },
    { headers: rate.headers },
  );
}
