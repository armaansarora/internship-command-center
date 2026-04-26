import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/stripe/entitlements";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getAgentModel } from "@/lib/ai/model";
import { buildCachedSystemMessages } from "@/lib/ai/prompt-cache";
import { buildOtisSystemPrompt } from "@/lib/agents/concierge/system-prompt";
import { getConciergeState } from "@/lib/db/queries/user-profiles-rest";
import { log } from "@/lib/logger";

/**
 * POST /api/concierge/chat — Otis's streaming dialogue endpoint.
 *
 * Auth-gated via Supabase session. No tools (Otis converses only). System
 * prompt is fresh per request — Otis has no persistent memory of prior
 * turns outside what the client sends in `messages`. The client passes its
 * locale context (timezone, localHour) so Otis's greeting register is
 * correct regardless of the server's UTC clock.
 *
 * Response: AI SDK v6 UI message stream — the Concierge panel on the
 * client consumes this identically to the C-suite panels.
 */
export const maxDuration = 120;

interface ConcieregePostBody {
  messages: UIMessage[];
  timezone?: string;
  localHour?: number;
}

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  const body = (await req.json().catch(() => null)) as ConcieregePostBody | null;
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const [state] = await Promise.all([getConciergeState(user.id)]);
  const guestName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  const localHour =
    typeof body.localHour === "number" && Number.isFinite(body.localHour)
      ? Math.max(0, Math.min(23, Math.floor(body.localHour)))
      : new Date().getUTCHours();

  const timezone = typeof body.timezone === "string" ? body.timezone : "UTC";
  const isFirstVisit = state?.conciergeCompletedAt === null;
  const lastFloorVisitedLabel = friendlyFloorLabel(state?.lastFloorVisited ?? null);

  const systemPrompt = buildOtisSystemPrompt({
    guestName,
    timezone,
    localHour,
    isFirstVisit,
    lastFloorVisitedLabel,
  });

  try {
    const cachedSystem = buildCachedSystemMessages(systemPrompt);
    const modelMessages = await convertToModelMessages(
      body.messages as Array<Omit<UIMessage, "id">>,
    );

    const result = streamText({
      model: getAgentModel(),
      messages: [...cachedSystem, ...modelMessages],
      stopWhen: stepCountIs(1),
    });

    log.info("concierge.stream.started", { userId: user.id });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    log.error("concierge.stream_failed", err, { userId: user.id });
    return NextResponse.json({ error: "stream failed" }, { status: 500 });
  }
}

/**
 * Map internal floor id (PH, 1, 2, 3, 4, 5, 6, 7, L) to the scene name so
 * Otis can reference it warmly ("you just came down from the Observatory").
 */
function friendlyFloorLabel(floorId: string | null): string {
  if (!floorId) return "";
  const names: Record<string, string> = {
    PH: "the Penthouse",
    "7": "the War Room",
    "6": "the Rolodex Lounge",
    "5": "the Writing Room",
    "4": "the Situation Room",
    "3": "the Briefing Room",
    "2": "the Observatory",
    "1": "the C-Suite",
    L: "the Lobby",
  };
  return names[floorId] ?? "";
}
