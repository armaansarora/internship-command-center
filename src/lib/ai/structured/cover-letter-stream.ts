/**
 * live-compose streaming helpers for the three-tone cover-letter path.
 *
 * Mirrors the non-streaming helpers in `cover-letter.ts` but uses AI SDK v6
 * `streamText`, so callers can render tokens as they arrive. Both helpers
 * share `getToneSystemPrompt`, so the three-tone divergence invariant
 * continues to hold at the streaming layer.
 *
 * Design: this file does NOT write to the DB. Persistence stays in the
 * existing CMO-tool flow. This module is a UI-side renderer of the same
 * generation the non-streaming path produces.
 */

import { streamText, generateText } from "ai";
import { getAgentModel, getActiveModelId } from "@/lib/ai/model";
import { getCachedSystem } from "@/lib/ai/prompt-cache";
import { recordAgentRun } from "@/lib/ai/telemetry";
import { getToneSystemPrompt } from "./cover-letter";

export interface ComposeInput {
  userId: string;
  companyName: string;
  role: string;
  tone: "formal" | "conversational" | "bold";
  jobDescription?: string;
  companyResearch?: string;
}

function buildUserPrompt(input: ComposeInput): string {
  const researchBlock = input.companyResearch
    ? `\n\nCOMPANY RESEARCH (cite specifics from this):\n${input.companyResearch.slice(0, 1500)}`
    : "";
  const jobBlock = input.jobDescription
    ? `\n\nJOB DESCRIPTION KEYWORDS (address these):\n${input.jobDescription.slice(0, 800)}`
    : "";
  return `Write a cover letter for ${input.companyName} — ${input.role}.
Tone: ${input.tone}${researchBlock}${jobBlock}

Lead with a HOOK that proves you've done the work. Make the value proposition concrete. Close with intent. Return prose — greeting on its own line, then the letter body, then a sign-off line.`;
}

export interface StreamedCoverLetter {
  /** Async iterable of token text deltas — render these as they arrive. */
  textStream: AsyncIterable<string>;
  /** Resolves to the full concatenated text once the stream completes. */
  fullText: Promise<string>;
}

/**
 * Stream a single tone variant as prose. Token-by-token for the live-compose
 * visual; the caller must await `fullText` to get the final assembled output.
 */
export function streamCoverLetterProse(input: ComposeInput): StreamedCoverLetter {
  const start = Date.now();
  const modelId = getActiveModelId();
  const system = getCachedSystem(getToneSystemPrompt(input.tone));
  const prompt = buildUserPrompt(input);

  const result = streamText({
    model: getAgentModel(),
    system,
    prompt,
  });

  // Telemetry after completion — fire-and-forget so the stream isn't held up.
  // AI SDK v6's `result.text` is typed as PromiseLike<string>, so we normalize
  // via Promise.resolve + await inside an IIFE.
  const finalTextPromise: Promise<string> = Promise.resolve(result.text);
  void (async (): Promise<void> => {
    let finalText = "";
    try {
      finalText = await finalTextPromise;
    } catch {
      finalText = "";
    }
    void recordAgentRun({
      userId: input.userId,
      agent: "cmo",
      action: "structured.cover_letter.stream",
      modelId,
      usage: undefined,
      durationMs: Date.now() - start,
      inputSummary: `${input.companyName} / ${input.role} (${input.tone})`,
      outputSummary: finalText.slice(0, 120),
    });
  })();

  return {
    textStream: result.textStream,
    fullText: finalTextPromise,
  };
}

/**
 * Non-streaming equivalent — same system prompt, same user prompt. Exists
 * for the round-trip equivalence proof. Not used in production UI paths;
 * the legacy `generateStructuredCoverLetter` (structured output) remains
 * the DB-writing path.
 */
export async function generateCoverLetterProse(input: ComposeInput): Promise<string> {
  const system = getCachedSystem(getToneSystemPrompt(input.tone));
  const prompt = buildUserPrompt(input);
  const result = await generateText({
    model: getAgentModel(),
    system,
    prompt,
  });
  return await Promise.resolve(result.text);
}
