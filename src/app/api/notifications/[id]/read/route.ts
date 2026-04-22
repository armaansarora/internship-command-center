import { NextResponse } from "next/server";
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
