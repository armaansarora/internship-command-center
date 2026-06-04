/**
 * POST /api/briefing/start-drill
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
import { log } from "@/lib/logger";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/http/request-body";
import { z } from "zod/v4";
import { randomUUID } from "crypto";

const Body = z.object({ interviewId: z.string().uuid() });

export async function POST(req: NextRequest): Promise<Response> {
  const user = await requireUser();
  const rate = await withRateLimit(user.id, "B");
  if (rate.response) return rate.response;

  const raw = await readJsonBodyWithLimit(req, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!raw.ok) {
    return NextResponse.json({ error: raw.error }, { status: raw.status });
  }

  const parsed = Body.safeParse(raw.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const tier = await getUserTier(user.id);
  const quota = await consumeAiQuota(user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
      { status: 429 },
    );
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
    .eq("user_id", user.id)
    .single();

  let packetSummary: string | null = null;
  if (interview.prep_packet_id) {
    const { data: pkt } = await sb
      .from("documents")
      .select("content")
      .eq("id", interview.prep_packet_id)
      .eq("user_id", user.id)
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

  let questions;
  try {
    questions = await generateDrillQuestions({
      company: app?.company_name ?? "Unknown",
      role: app?.role ?? "Unknown",
      round: interview.round ?? "1",
      packetSummary,
    });
  } catch (err) {
    // AI provider error (rate limit, upstream 5xx, malformed completion).
    // Fail with a clean 503 the client can retry instead of a raw 500.
    log.error("briefing.start_drill.ai_failed", err, { userId: user.id });
    return NextResponse.json({ error: "drill_failed" }, { status: 503 });
  }

  return NextResponse.json({
    drillId: randomUUID(),
    interviewId: interview.id,
    company: app?.company_name ?? "Unknown",
    round: interview.round ?? "1",
    questions,
  });
}
