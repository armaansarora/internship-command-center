import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ArtLabLlmBrain, ArtLabLlmDecisionRequest, ArtLabLlmDecisionResult } from "./llm-brain";
import { SYSTEM_PROMPTS_BY_KIND } from "./system-prompts";
import { defaultTimeoutForKind, withRetryAndTimeout } from "./brain-retry";
import { validateDecisionOutput } from "./decision-schemas";

interface ClaudeBrainOptions {
  apiKey?: string;
  /**
   * Claude Max/Pro subscription OAuth token (from `claude setup-token`,
   * exported as CLAUDE_CODE_OAUTH_TOKEN). When set, the brain authenticates
   * against the subscription instead of a metered API key — $0 incremental
   * spend within the plan. Falls back to `apiKey` when absent.
   */
  oauthToken?: string;
  model: string;
}

export interface ArtLabClaudeBrain extends ArtLabLlmBrain {
  modelId: string;
}

// Anthropic's subscription (Claude Code / Max) auth uses a Bearer OAuth token
// plus the oauth beta header instead of `x-api-key`. We wrap fetch to enforce
// that header shape so the AI SDK's Anthropic provider bills the user's Claude
// plan rather than a metered API key. Exported for unit testing.
export function createOAuthFetch(token: string): typeof globalThis.fetch {
  return (async (
    input: Parameters<typeof globalThis.fetch>[0],
    init?: Parameters<typeof globalThis.fetch>[1],
  ) => {
    const headers = new Headers(init?.headers);
    headers.delete("x-api-key");
    headers.set("authorization", `Bearer ${token}`);
    if (!headers.has("anthropic-beta")) {
      headers.set("anthropic-beta", "oauth-2025-04-20");
    }
    return globalThis.fetch(input, { ...init, headers });
  }) as typeof globalThis.fetch;
}

export function createClaudeBrain(options: ClaudeBrainOptions): ArtLabClaudeBrain {
  const provider = options.oauthToken
    ? createAnthropic({ apiKey: "", fetch: createOAuthFetch(options.oauthToken) })
    : createAnthropic({ apiKey: options.apiKey ?? "" });
  return {
    modelId: options.model,
    async decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
      if (process.env.ARTLAB_CLAUDE_MODE === "dry-run") {
        return {
          kind: req.kind,
          outputJson: { dryRun: true, echoedInput: req.input },
          confidence: 0,
          tokensIn: 0,
          tokensOut: 0,
          model: options.model,
        };
      }
      const system = SYSTEM_PROMPTS_BY_KIND[req.kind];
      const startedAt = Date.now();
      const envelope = await withRetryAndTimeout(
        async (signal) => {
          return await generateText({
            model: provider(options.model),
            abortSignal: signal,
            messages: [
              {
                role: "system",
                content: system,
                providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
              },
              { role: "user", content: JSON.stringify(req.input) },
            ],
          });
        },
        {
          opName: `claude-brain[${req.kind}]`,
          timeoutMs: defaultTimeoutForKind(req.kind),
        },
      );
      const { text, usage } = envelope.result;
      let outputJson: Record<string, unknown> = {};
      try {
        outputJson = JSON.parse(text);
      } catch {
        outputJson = { _parseError: "malformed-json", rawText: text.slice(0, 500) };
      }
      const validation = validateDecisionOutput(req.kind, outputJson);
      return {
        kind: req.kind,
        outputJson,
        confidence: typeof outputJson.confidence === "number" ? outputJson.confidence : 0.5,
        tokensIn: usage.inputTokens ?? 0,
        tokensOut: usage.outputTokens ?? 0,
        model: options.model,
        retryCount: envelope.retryCount,
        lastTransientError: envelope.lastError,
        validationError: validation.ok ? undefined : validation.error,
        durationMs: Date.now() - startedAt,
      };
    },
  };
}
