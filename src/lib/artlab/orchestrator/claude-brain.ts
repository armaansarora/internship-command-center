import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ArtLabLlmBrain, ArtLabLlmDecisionRequest, ArtLabLlmDecisionResult } from "./llm-brain";
import { SYSTEM_PROMPTS_BY_KIND } from "./system-prompts";
import { defaultTimeoutForKind, withRetryAndTimeout } from "./brain-retry";
import { validateDecisionOutput } from "./decision-schemas";

interface ClaudeBrainOptions {
  apiKey: string;
  model: string;
}

export interface ArtLabClaudeBrain extends ArtLabLlmBrain {
  modelId: string;
}

export function createClaudeBrain(options: ClaudeBrainOptions): ArtLabClaudeBrain {
  const provider = createAnthropic({ apiKey: options.apiKey });
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
