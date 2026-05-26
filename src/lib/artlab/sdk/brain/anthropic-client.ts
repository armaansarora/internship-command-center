import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type ModelMessage } from "ai";

export interface ArtLabAnthropicCall {
  systemPrompt: string;
  userJson: Record<string, unknown>;
  model: string;
  apiKey: string;
  dryRun?: boolean;
  /** Test seam — when supplied, called instead of `ai.generateText`. */
  generateTextOverride?: (req: {
    model: unknown;
    messages: ModelMessage[];
    abortSignal?: AbortSignal;
  }) => Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }>;
}

export interface ArtLabAnthropicResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  dryRun?: boolean;
}

export async function callArtLabAnthropic(call: ArtLabAnthropicCall): Promise<ArtLabAnthropicResponse> {
  if (call.dryRun) {
    return {
      text: JSON.stringify({ dryRun: true, echoedInput: call.userJson }),
      tokensIn: 0,
      tokensOut: 0,
      durationMs: 0,
      dryRun: true,
    };
  }
  const provider = createAnthropic({ apiKey: call.apiKey });
  const startedAt = Date.now();
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: call.systemPrompt,
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    { role: "user", content: JSON.stringify(call.userJson) },
  ];
  const runner =
    call.generateTextOverride ??
    (async (req: { model: unknown; messages: ModelMessage[]; abortSignal?: AbortSignal }) => {
      const result = await generateText({
        model: req.model as Parameters<typeof generateText>[0]["model"],
        messages: req.messages,
        abortSignal: req.abortSignal,
      });
      return {
        text: result.text,
        usage: {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
        },
      };
    });
  const { text, usage } = await runner({ model: provider(call.model), messages });
  return {
    text,
    tokensIn: usage.inputTokens,
    tokensOut: usage.outputTokens,
    durationMs: Date.now() - startedAt,
  };
}
