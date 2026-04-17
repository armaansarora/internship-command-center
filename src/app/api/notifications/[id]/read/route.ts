import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/require-user";
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

  return NextResponse.json({ data: { success: true }, error: null });
}
