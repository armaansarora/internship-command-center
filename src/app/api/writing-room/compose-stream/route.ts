/**
 * POST /api/writing-room/compose-stream
 *
 * Streams one tone variant of a cover letter as text/plain tokens. The
 * client fires three of these in parallel (one per tone) to power the
 * live-compose panel. No DB writes — persistence stays in the existing
 * CMO-tool flow. This route is a UI-side renderer.
 *
 * Auth-gated via Supabase session. 503 when AI provider not configured.
 */

import { z } from "zod/v4";
import { NextResponse } from "next/server";
import { streamText } from "ai";
import { getUser } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/stripe/entitlements";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getAgentModel, getActiveModelId } from "@/lib/ai/model";
import { buildCachedSystemAndUserMessages } from "@/lib/ai/prompt-cache";
import { recordAgentRun } from "@/lib/ai/telemetry";
import { getToneSystemPrompt } from "@/lib/ai/structured/cover-letter";
import { COVER_LETTER_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budgets";
import { log } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/http/request-body";

export const maxDuration = 120;

const BodySchema = z.object({
  tone: z.enum(["formal", "conversational", "bold"]),
  companyName: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  jobDescription: z.string().max(20_000).optional(),
  companyResearch: z.string().max(20_000).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rate = await withRateLimit(user.id, "B");
  if (rate.response) return rate.response;

  const raw = await readJsonBodyWithLimit(req, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!raw.ok) {
    return NextResponse.json({ error: raw.error }, { status: raw.status });
  }

  const parsed = BodySchema.safeParse(raw.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const tier = await getUserTier(user.id);
  const quota = await consumeAiQuota(user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "ai_quota_exceeded",
        message: `You've used today's AI allowance (${quota.cap} runs). Resets at 00:00 UTC.`,
        used: quota.used,
        cap: quota.cap,
      },
      { status: 429 },
    );
  }

  const model = getAgentModel();
  if (!model) {
    return NextResponse.json({ error: "ai_provider_missing" }, { status: 503 });
  }

  const researchBlock = body.companyResearch
    ? `\n\nCOMPANY RESEARCH (cite specifics from this):\n${body.companyResearch.slice(0, 1500)}`
    : "";
  const jobBlock = body.jobDescription
    ? `\n\nJOB DESCRIPTION KEYWORDS (address these):\n${body.jobDescription.slice(0, 800)}`
    : "";
  const userPrompt = `Write a cover letter for ${body.companyName} — ${body.role}.
Tone: ${body.tone}${researchBlock}${jobBlock}

Lead with a HOOK that proves you've done the work. Make the value proposition concrete. Close with intent. Return prose — greeting on its own line, then the letter body, then a sign-off line.`;

  const start = Date.now();
  try {
    const result = streamText({
      model,
      messages: buildCachedSystemAndUserMessages(
        getToneSystemPrompt(body.tone),
        userPrompt,
      ),
      maxOutputTokens: COVER_LETTER_MAX_OUTPUT_TOKENS,
    });

    // Telemetry after finish (not awaited here — the stream starts immediately).
    // AI SDK v6's `result.text` is PromiseLike; Promise.resolve normalizes it.
    void (async (): Promise<void> => {
      try {
        const finalText: string = await Promise.resolve(result.text);
        void recordAgentRun({
          userId: user.id,
          agent: "cmo",
          action: "structured.cover_letter.stream",
          modelId: getActiveModelId(),
          usage: undefined,
          durationMs: Date.now() - start,
          inputSummary: `${body.companyName} / ${body.role} (${body.tone})`,
          outputSummary: finalText.slice(0, 120),
        });
      } catch (err) {
        log.error("[writing-room/compose-stream] finish handler failed", err, {
          userId: user.id,
          tone: body.tone,
        });
      }
    })();

    log.info("compose-stream.started", { userId: user.id, tone: body.tone });
    return result.toTextStreamResponse();
  } catch (err) {
    log.error("[writing-room/compose-stream] stream failed", err, {
      userId: user.id,
      tone: body.tone,
    });
    return NextResponse.json({ error: "stream_failed" }, { status: 500 });
  }
}
