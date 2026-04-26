/**
 * POST /api/briefing/complete-drill
 *
 * Finalises a drill: validates the full `DebriefContent` payload, stores it
 * as a `documents` row of type "debrief" (the Briefing Room binder view
 * reads from here), and — when the drill is tied to an `interviewId` —
 * attaches the resulting `debrief_id` to the interview row so the Situation
 * Room timeline can surface it next to the interview.
 *
 * The debrief document is the sole source of truth for the drill — all
 * downstream readers (`listBindersForUser`, `readBinder`) hydrate off this
 * single row.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, createClient } from "@/lib/supabase/server";
import { DebriefContentSchema, stringifyDebriefContent } from "@/types/debrief";
import { z } from "zod/v4";

const Body = z.object({
  interviewId: z.string().uuid().nullable(),
  debrief: DebriefContentSchema,
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const sb = await createClient();
  const title = `Debrief — ${parsed.data.debrief.company} (${parsed.data.debrief.round})`;

  const { data: doc, error } = await sb
    .from("documents")
    .insert({
      user_id: user.id,
      type: "debrief",
      title,
      content: stringifyDebriefContent(parsed.data.debrief),
      version: 1,
      is_active: true,
      generated_by: "cpo",
    })
    .select("id")
    .single();
  if (error || !doc) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  if (parsed.data.interviewId) {
    await sb
      .from("interviews")
      .update({ debrief_id: doc.id })
      .eq("id", parsed.data.interviewId);
  }
  return NextResponse.json({ binderId: doc.id });
}
