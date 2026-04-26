/**
 * GET /api/briefing/binder/[id]
 *
 * Returns the fully-parsed `DebriefContent` for a single binder owned
 * by the current user. The BinderOpen flip-view lazy-fetches from here
 * when the user clicks a spine on the shelf. 404 if the binder does
 * not exist, is not a debrief document, or does not belong to the
 * authenticated user (RLS enforced at the query layer).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { readBinder } from "@/lib/db/queries/debriefs-rest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser();
  const { id } = await params;
  const c = await readBinder(user.id, id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(c);
}
