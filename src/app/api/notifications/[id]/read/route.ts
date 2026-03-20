import { NextResponse } from "next/server";
import { requireUser, createClient } from "@/lib/supabase/server";

/**
 * POST /api/notifications/:id/read
 * Marks a single notification as read.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await requireUser();
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { success: true }, error: null });
}
