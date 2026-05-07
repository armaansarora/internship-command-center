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
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/http/request-body";
import { z } from "zod/v4";

const Body = z.object({
  interviewId: z.string().uuid().nullable(),
  debrief: DebriefContentSchema,
});

export async function POST(req: NextRequest): Promise<Response> {
  const user = await requireUser();
  const rate = await withRateLimit(user.id, "C");
  if (rate.response) return rate.response;

  const raw = await readJsonBodyWithLimit(req, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!raw.ok) {
    return NextResponse.json({ error: raw.error }, { status: raw.status });
  }

  const parsed = Body.safeParse(raw.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const sb = await createClient();
  if (parsed.data.interviewId) {
    const { data: interview } = await sb
      .from("interviews")
      .select("id")
      .eq("id", parsed.data.interviewId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!interview) {
      return NextResponse.json({ error: "interview not found" }, { status: 404 });
    }
  }

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
      .eq("id", parsed.data.interviewId)
      .eq("user_id", user.id);
  }
  return NextResponse.json({ binderId: doc.id });
}
