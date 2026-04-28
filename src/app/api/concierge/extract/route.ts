import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getUser } from "@/lib/supabase/server";
import {
  extractTargetProfileFromConversation,
  persistSkipPlaceholderProfile,
  type ExtractionTurn,
} from "@/lib/agents/concierge/extract";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { log } from "@/lib/logger";

const MAX_TRANSCRIPT_BYTES = 20_000;

/**
 * POST /api/concierge/extract — Concierge hand-off.
 *
 * Called by the Lobby client when Otis's conversation reaches a natural
 * close (user confirms) OR when the user clicks Skip. Captures the
 * conversation transcript and persists the extracted target profile into
 * both `agent_memory` (the canonical [target_profile_v1] row with an
 * embedding, used by Job Discovery) and `user_profiles.concierge_target_profile`
 * (the fast-read mirror + `concierge_completed_at` stamp).
 *
 * On skip: writes a minimum-viable placeholder so the bootstrap Job
 * Discovery has something to run against. The guest never reaches the
 * Penthouse with no profile.
 *
 * The response includes the completedAt timestamp; the client then fires
 * `/api/onboarding/bootstrap-discovery` (R4.5) to populate discovered
 * applications before the cinematic elevator ride completes.
 */
export const maxDuration = 60;

const TurnSchema = z.object({
  role: z.enum(["assistant", "user"]),
  text: z.string().min(1).max(2_000),
});

const BodySchema = z.object({
  turns: z.array(TurnSchema).max(40),
  skip: z.boolean().optional().default(false),
});

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { turns, skip } = parsed.data;

  const transcriptBytes = turns.reduce((sum, turn) => sum + turn.text.length, 0);
  if (transcriptBytes > MAX_TRANSCRIPT_BYTES) {
    return NextResponse.json(
      { error: "transcript_too_large", bytes: transcriptBytes, cap: MAX_TRANSCRIPT_BYTES },
      { status: 400 },
    );
  }

  // Skip path persists a placeholder; only the conversation path consumes a
  // call (it invokes generateObject against the configured model).
  if (!skip && turns.length > 0) {
    const tier = await getUserTier(user.id);
    const quota = await consumeAiQuota(user.id, tier);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
        { status: 429 },
      );
    }
  }

  const result = skip || turns.length === 0
    ? await persistSkipPlaceholderProfile(user.id)
    : await extractTargetProfileFromConversation(
        user.id,
        turns as ExtractionTurn[],
      );

  if (!result) {
    log.error("concierge.extract.persist_failed", undefined, {
      userId: user.id,
      skip,
      turns: turns.length,
    });
    return NextResponse.json(
      { error: "extraction failed" },
      { status: 500 },
    );
  }

  log.info("concierge.extract.done", {
    userId: user.id,
    source: result.source,
    roles: result.profile.roles.length,
    geos: result.profile.geos.length,
  });

  return NextResponse.json({
    ok: true,
    source: result.source,
    completedAt: result.completedAt,
    profile: result.profile,
  });
}
