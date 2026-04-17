/**
 * shared-route-handler — Factory for the 8 C-suite agent API routes.
 *
 * Pipeline per request:
 *   1. requireUser
 *   2. rate-limit
 *   3. fetch agent-specific context (stats / briefing data / etc.)
 *   4. derive userName fallback
 *   5. retrieve top-K memories for this (user, agent) pair
 *   6. build system prompt (with memories spliced in)
 *   7. build tools
 *   8. streamText
 *        - model from `getAgentModel()` — Gateway w/ failover when configured,
 *          direct Anthropic SDK otherwise
 *        - system message converted to multi-part with `cacheControl: ephemeral`
 *          on the stable LAYER 1+2 prefix
 *        - `onFinish` writes agent_logs (tokens + cost + duration) AND queues
 *          memory extraction
 *   9. toUIMessageStreamResponse
 *
 * The factory captures that skeleton so each route file becomes a one-liner.
 * The CEO route additionally injects orchestrator dispatch tools — that case
 * is handled by the optional `extraTools` config field.
 */

import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type {
  UIMessage,
  LanguageModel,
  ModelMessage,
  TextPart,
  StreamTextOnFinishCallback,
  ToolSet,
} from "ai";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { requireAgentAccess } from "@/lib/stripe/agent-access";
import { log } from "@/lib/logger";
import { requireEnv } from "@/lib/env";
import type { User } from "@supabase/supabase-js";

import { getAgentModel, getActiveModelId } from "@/lib/ai/model";
import { buildCachedSystemMessages } from "@/lib/ai/prompt-cache";
import { recordAgentRun } from "@/lib/ai/telemetry";
import { extractAndStoreMemories } from "@/lib/ai/memory-extractor";
import { getMemoriesForContext } from "@/lib/db/queries/agent-memory-rest";

/**
 * Tools shape — record of `tool(...)` outputs from `ai`. We deliberately keep
 * it loose because each agent's `buildXTools` returns its own concrete shape;
 * pinning a stricter type here would force every agent to add a
 * `satisfies ToolSet` annotation.
 */
type AgentToolSet = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Per-agent configuration
// ---------------------------------------------------------------------------

/**
 * Strict configuration interface — each agent supplies these pieces.
 * `Context` is the agent-specific shape returned by `loadContext` and consumed
 * by `buildSystemPrompt`.
 */
export interface AgentRouteConfig<Context> {
  /** Lower-case agent key (cro, coo, ceo, ...) — used by memory + telemetry. */
  agentKey: string;
  /** Fetch all dynamic data the system prompt needs (stats, snapshots, etc). */
  loadContext: (user: User) => Promise<Context>;
  /**
   * Build the system prompt from context + display name + retrieved memories.
   * Memories come from the rolling agent_memory table and are injected into
   * the prompt's MEMORY FROM PRIOR SESSIONS block by every per-agent builder.
   */
  buildSystemPrompt: (
    ctx: Context,
    userName: string,
    memories: Array<{ content: string; category: string }>,
  ) => string;
  /** Build the tool set the model can invoke for this user. */
  buildTools: (userId: string) => AgentToolSet;
  /**
   * Optional extra tools, merged into the tool set built by `buildTools`.
   * Used by the CEO route to inject dispatchToCRO / dispatchToCOO / ... — the
   * orchestrator keeps that wiring out of the per-agent tools file because
   * the CEO needs the user name + closure context.
   */
  buildExtraTools?: (userId: string, userName: string) => AgentToolSet;
  /** Fallback display-name when both metadata and email-prefix are missing. */
  defaultUserName?: string;
  /** Optional model override. Defaults to `getAgentModel()`. */
  model?: LanguageModel;
  /**
   * Optional stopWhen step count. Defaults to 5. The CEO route uses 3 because
   * each step may invoke a nested subagent costing its own multi-step loop.
   */
  maxSteps?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveUserName(user: User, fallback: string): string {
  const fromMetadata = user.user_metadata?.full_name as string | undefined;
  const fromEmail = user.email?.split("@")[0];
  return fromMetadata ?? fromEmail ?? fallback;
}

/** Pull the last user message text from a UI message stream payload. */
function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const parts = Array.isArray(m.parts) ? m.parts : [];
    const text = parts
      .filter((p): p is TextPart => (p as TextPart).type === "text")
      .map((p) => p.text)
      .join("");
    if (text.trim().length > 0) return text;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a Next.js App Router POST handler for an agent route.
 *
 * @example
 *   // src/app/api/cro/route.ts
 *   export const maxDuration = 60;
 *   export const POST = createAgentRouteHandler<PipelineStats>({
 *     agentKey: "cro",
 *     loadContext: (user) => getPipelineStatsRest(user.id),
 *     buildSystemPrompt: (stats, name, memories) =>
 *       buildCROSystemPrompt(stats, name, memories),
 *     buildTools: (uid) => buildCROTools(uid),
 *   });
 */
export function createAgentRouteHandler<Context>(
  config: AgentRouteConfig<Context>,
): (req: Request) => Promise<Response> {
  const {
    agentKey,
    loadContext,
    buildSystemPrompt,
    buildTools,
    buildExtraTools,
    defaultUserName = "Analyst",
    model,
    maxSteps = 5,
  } = config;

  return async function POST(req: Request): Promise<Response> {
    const startedAt = Date.now();

    // Fail fast at the boundary if Anthropic isn't configured.
    requireEnv(["ANTHROPIC_API_KEY"] as const);

    const auth = await requireUserApi();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const accessResponse = await requireAgentAccess(user.id);
    if (accessResponse) return accessResponse;

    const check = await withRateLimit(user.id);
    if (check.response) return check.response;

    let body: { messages: UIMessage[] };
    try {
      body = (await req.json()) as { messages: UIMessage[] };
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: check.headers }
      );
    }
    const { messages } = body;

    // Memory + context loaded in parallel. Memory call is intentionally
    // forgiving: any failure returns [] rather than throwing, so a memory
    // outage never blocks chat.
    let ctx: Context;
    let memories: Array<{ content: string; category: string }> = [];
    try {
      [ctx, memories] = await Promise.all([
        loadContext(user),
        getMemoriesForContext(user.id, agentKey, 5),
      ]);
    } catch (err) {
      log.error("agent.load_context_failed", err, { agent: agentKey, userId: user.id });
      return Response.json(
        { error: "Failed to prepare agent context" },
        { status: 500, headers: check.headers }
      );
    }
    const userName = deriveUserName(user, defaultUserName);

    const systemPrompt = buildSystemPrompt(ctx, userName, memories);
    const tools = {
      ...buildTools(user.id),
      ...(buildExtraTools ? buildExtraTools(user.id, userName) : {}),
    };

    const modelMessages = await convertToModelMessages(
      messages as Array<Omit<UIMessage, "id">>,
    );

    // Splice the cached system message at the head so providerOptions →
    // anthropic → cacheControl reaches the model. Falling back to a plain
    // string `system` would silently drop the cache directive.
    const cachedSystem = buildCachedSystemMessages(systemPrompt);
    const allMessages: ModelMessage[] = [...cachedSystem, ...modelMessages];

    // Capture context for the onFinish callback. We snapshot `lastUserText`
    // before the stream starts so memory extraction sees what the user
    // actually sent (the streamed assistant text is captured by the SDK).
    const userMessageText = lastUserText(messages);
    const modelId = getActiveModelId();

    const onFinish: StreamTextOnFinishCallback<ToolSet> = async ({
      text,
      usage,
      toolCalls,
      toolResults,
      finishReason,
    }) => {
      const durationMs = Date.now() - startedAt;
      const toolNames = (toolCalls ?? [])
        .map((t) => t.toolName)
        .filter(Boolean)
        .join(",");

      // Persist token + cost row for the CFO floor. Fire-and-forget.
      void recordAgentRun({
        userId: user.id,
        agent: agentKey,
        action: toolNames ? `chat[${toolNames}]` : "chat",
        modelId,
        usage,
        durationMs,
        inputSummary: userMessageText.slice(0, 500),
        outputSummary: text.slice(0, 500),
        status: finishReason === "error" ? "failed" : "completed",
      });

      // Queue memory extraction. Skipped for trivial exchanges by the
      // extractor itself. Best-effort + cap-enforced; never throws.
      void extractAndStoreMemories({
        userId: user.id,
        agent: agentKey,
        userMessage: userMessageText,
        assistantMessage: text,
        toolCallSummary: (toolResults ?? [])
          .map((r) => r.toolName)
          .filter(Boolean)
          .join(", "),
      });
    };

    try {
      const result = streamText({
        model: model ?? getAgentModel(),
        messages: allMessages,
        // Cast at the boundary — each agent's tools satisfy ToolSet structurally;
        // we widen here so the factory doesn't force every agent to annotate.
        tools: tools as Parameters<typeof streamText>[0]["tools"],
        stopWhen: stepCountIs(maxSteps),
        onFinish,
      });

      log.info("agent.stream.started", { agent: agentKey, userId: user.id });
      return result.toUIMessageStreamResponse();
    } catch (err) {
      log.error("agent.stream_failed", err, { agent: agentKey, userId: user.id });
      return Response.json(
        { error: "Agent streaming failed" },
        { status: 500, headers: check.headers }
      );
    }
  };
}
