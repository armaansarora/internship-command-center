import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { getUser } from "@/lib/supabase/server";
import { getPipelineStats } from "@/lib/db/queries/applications";
import { buildCROSystemPrompt } from "@/lib/agents/cro/system-prompt";
import { buildCROTools } from "@/lib/agents/cro/tools";
import { enforceCroRateLimit } from "@/lib/rate-limit/cro";
import { logCroAgentRun } from "@/lib/agents/cro/agent-run-log";

export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

const croPostBodySchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
});

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const len = req.headers.get("content-length");
  if (len && Number.parseInt(len, 10) > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request body too large" }, 413);
  }

  const rate = await enforceCroRateLimit(user.id);
  if (rate.limited) {
    return jsonResponse(
      {
        error: "Too many AI requests. Slow down or try again shortly.",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      429,
      { "Retry-After": String(rate.retryAfterSeconds) }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const parsed = croPostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const messages = parsed.data.messages ?? [];

  const stats = await getPipelineStats(user.id);

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Analyst";

  const systemPrompt = buildCROSystemPrompt(stats, userName, []);

  const tools = buildCROTools(user.id);

  const modelMessages = await convertToModelMessages(
    messages as Array<Omit<UIMessage, "id">>
  );

  const started = Date.now();
  let finalized = false;
  const finalize = async (
    status: "completed" | "failed",
    opts?: { errorMessage?: string | null; tokensUsed?: number | null }
  ) => {
    if (finalized) return;
    finalized = true;
    await logCroAgentRun({
      userId: user.id,
      status,
      durationMs: Date.now() - started,
      tokensUsed: opts?.tokensUsed ?? null,
      errorMessage: opts?.errorMessage ?? null,
      outputSummary: null,
    });
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    onError: async ({ error }) => {
      await finalize("failed", { errorMessage: String(error) });
    },
    onFinish: async ({ totalUsage }) => {
      await finalize("completed", {
        tokensUsed: totalUsage?.totalTokens ?? null,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
