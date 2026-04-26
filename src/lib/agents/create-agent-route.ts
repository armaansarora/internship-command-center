import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage, ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { User } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { requireAgentAccess } from "@/lib/stripe/agent-access";
import { getUserTier } from "@/lib/stripe/entitlements";
import { consumeAiQuota } from "@/lib/ai/quota";
import { log } from "@/lib/logger";
import { requireEnv } from "@/lib/env";

/**
 * Shape of the context each agent loads before the LLM is invoked.
 * `systemPrompt` becomes the `system` field; `tools` is passed through.
 */
export interface AgentContext {
  systemPrompt: string;
  tools: ToolSet;
}

/**
 * Per-agent configuration. Each agent only has to write `loadContext`
 * — the factory handles auth, rate limits, entitlements, streaming,
 * error logging, and model selection.
 */
export interface AgentRouteConfig {
  /** Stable identifier, used for logging and metrics. */
  id: string;
  /** Anthropic model to use for this agent. */
  model?: string;
  /** Vercel function maxDuration in seconds. */
  maxDuration?: number;
  /** Max reasoning steps allowed in a single request. */
  maxSteps?: number;
  /** Derive display name for a user — default: first part of email / full_name / fallback. */
  deriveUserName?: (user: User) => string;
  /** Produce the system prompt + tools for this request. */
  loadContext: (args: { user: User; userName: string }) => Promise<AgentContext>;
}

/** Shape of the body we accept on any agent route. */
const BodySchema = z.object({
  messages: z.array(z.any()).min(1, "messages must be a non-empty array"),
});

/** Default name derivation — keep identical to prior behaviour. */
function defaultDeriveName(user: User): string {
  const full = user.user_metadata?.full_name as string | undefined;
  if (full && full.length > 0) return full;
  const local = user.email?.split("@")[0];
  return local && local.length > 0 ? local : "Analyst";
}

/**
 * Build the POST handler for an agent chat endpoint.
 * Callers should do:
 *
 *   export const maxDuration = 60;
 *   export const POST = createAgentRoute({ id: "cro", loadContext: ... });
 */
export function createAgentRoute(config: AgentRouteConfig): (req: Request) => Promise<Response> {
  const modelId = config.model ?? "claude-sonnet-4-6";
  const maxSteps = config.maxSteps ?? 5;
  const deriveName = config.deriveUserName ?? defaultDeriveName;

  return async function POST(req: Request): Promise<Response> {
    // Fail fast at the boundary if Anthropic isn't configured.
    requireEnv(["ANTHROPIC_API_KEY"] as const);

    const auth = await requireUserApi();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const accessResponse = await requireAgentAccess(user.id);
    if (accessResponse) return accessResponse;

    const rate = await withRateLimit(user.id);
    if (rate.response) return rate.response;

    // Per-user-per-UTC-day AI call cap. Defends against runaway provider
    // bills on Free tier and against abuse on paid tiers. Fail-open on
    // infrastructure errors so a transient DB hiccup doesn't lock every
    // user out of every agent.
    const tier = await getUserTier(user.id);
    const quota = await consumeAiQuota(user.id, tier);
    if (!quota.allowed) {
      log.info("agent.quota_exceeded", { agent: config.id, userId: user.id, used: quota.used, cap: quota.cap });
      return Response.json(
        {
          error: "ai_quota_exceeded",
          message: `You've used today's AI agent allowance (${quota.cap} runs). Resets at 00:00 UTC.`,
          used: quota.used,
          cap: quota.cap,
        },
        { status: 429, headers: rate.headers },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: rate.headers }
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400, headers: rate.headers }
      );
    }

    const messages = parsed.data.messages as UIMessage[];
    const userName = deriveName(user);

    let ctx: AgentContext;
    try {
      ctx = await config.loadContext({ user, userName });
    } catch (err) {
      log.error("agent.load_context_failed", err, { agent: config.id, userId: user.id });
      return Response.json(
        { error: "Failed to prepare agent context" },
        { status: 500, headers: rate.headers }
      );
    }

    const modelMessages = await convertToModelMessages(
      messages as Array<Omit<UIMessage, "id">>
    );

    try {
      const result = streamText({
        model: anthropic(modelId),
        system: ctx.systemPrompt,
        messages: modelMessages,
        tools: ctx.tools,
        stopWhen: stepCountIs(maxSteps),
      });

      log.info("agent.stream.started", { agent: config.id, userId: user.id });
      return result.toUIMessageStreamResponse();
    } catch (err) {
      log.error("agent.stream_failed", err, { agent: config.id, userId: user.id });
      return Response.json(
        { error: "Agent streaming failed" },
        { status: 500, headers: rate.headers }
      );
    }
  };
}
