/**
 * R6.7 — POST /api/briefing/start-drill
 *
 * Kicks off a fresh interview-prep drill. Given an `interviewId` the user
 * owns, resolves the backing application (for company / role) and the
 * attached prep packet (if one exists) to build a compact context summary,
 * then asks the CPO to produce 3 mock interview questions. Returns a fresh
 * `drillId` the client uses to tie subsequent score / complete calls back
 * together with the audio-upload bucket path.
 *
 * The drillId is a client-side UUID; no new row is created until the user
 * finishes the drill (see complete-drill). Keeps the start endpoint cheap +
 * idempotent-per-call so a retry doesn't leak rows.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, createClient } from "@/lib/supabase/server";
import { generateDrillQuestions } from "@/lib/ai/structured/drill-questions";
import { z } from "zod/v4";
import { randomUUID } from "crypto";

const Body = z.object({ interviewId: z.string().uuid() });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const sb = await createClient();
  const { data: interview } = await sb
    .from("interviews")
    .select("id, application_id, round, prep_packet_id, user_id")
    .eq("id", parsed.data.interviewId)
    .eq("user_id", user.id)
    .single();
  if (!interview) {
    return NextResponse.json({ error: "interview not found" }, { status: 404 });
  }

  const { data: app } = await sb
    .from("applications")
    .select("company_name, role")
    .eq("id", interview.application_id)
    .single();

  let packetSummary: string | null = null;
  if (interview.prep_packet_id) {
    const { data: pkt } = await sb
      .from("documents")
      .select("content")
      .eq("id", interview.prep_packet_id)
      .single();
    if (pkt?.content) {
      try {
        const parsedPkt = JSON.parse(pkt.content) as {
          companyOverview?: { industry?: string };
          talkingPoints?: string[];
        };
        const industry = parsedPkt?.companyOverview?.industry ?? "";
        const tp = (parsedPkt?.talkingPoints ?? []).slice(0, 3).join("; ");
        packetSummary = `${industry} — ${tp}`.trim();
      } catch {
        /* malformed packet — proceed without context */
      }
    }
  }

  const questions = await generateDrillQuestions({
    company: app?.company_name ?? "Unknown",
    role: app?.role ?? "Unknown",
    round: interview.round ?? "1",
    packetSummary,
  });

  return NextResponse.json({
    drillId: randomUUID(),
    interviewId: interview.id,
    company: app?.company_name ?? "Unknown",
    round: interview.round ?? "1",
    questions,
  });
}
