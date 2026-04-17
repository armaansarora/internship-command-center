/**
 * Memory extraction — runs after every substantive chat exchange.
 *
 * Pattern (MemGPT / Letta inspired):
 *   1. Build a compressed transcript of the exchange (last user turn + final
 *      assistant turn, plus a one-line summary of any tool calls).
 *   2. Ask a fast model (Haiku) to extract 0-3 salient memories as structured
 *      JSON via `Output.array(MemoryEntrySchema)`. The model is allowed to
 *      return an empty array when nothing is worth remembering.
 *   3. Persist each via {@link storeAgentMemory}. The store enforces the
 *      rolling per-(user, agent) cap.
 *
 * This MUST NOT throw — memory extraction is auxiliary and should never
 * impact the user-facing response. Errors are swallowed and logged.
 *
 * Cost: a few hundred input tokens at Haiku rates per chat exchange. Roughly
 * $0.0003 per memory-extraction round.
 */

import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { getFastModel, FAST_MODEL_ID } from "./model";
import { storeAgentMemory } from "@/lib/db/queries/agent-memory-rest";
import { recordAgentRun } from "./telemetry";
import { log } from "@/lib/logger";

const MIN_USER_INPUT_CHARS = 30;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const MemoryEntrySchema = z.object({
  category: z
    .enum(["preference", "pattern", "fact", "feedback"])
    .describe(
      "Type of memory: preference (user prefers X), pattern (user often does Y), fact (user told me Z about themselves/companies), feedback (user reacted positively or negatively)",
    ),
  content: z
    .string()
    .max(280)
    .describe(
      "A single concise sentence capturing the memory. Reference specifics by name (companies, roles, contacts) when possible. Avoid first-person wording — write it as a third-party note.",
    ),
  importance: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0.0 = trivial, 0.5 = useful context, 1.0 = critical to remember (career direction, hard preferences, named companies)",
    ),
});

const ExtractionSchema = z.object({
  memories: z.array(MemoryEntrySchema).max(3),
});

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM = `You extract durable memories from a single chat exchange between a user and one of The Tower's character agents (CEO, CRO, COO, CNO, CIO, CMO, CPO, CFO).

Your job: identify what is worth remembering for **future** sessions with this same agent. Return at most 3 memories, often 0-1.

Worth remembering:
  - Concrete facts about the user (target companies, roles, sectors, deadlines, named contacts)
  - Stated preferences (formal tone, no Saturdays, prefers boutique firms)
  - Recurring patterns (always asks for follow-ups before lunch)
  - Strong feedback ("I hated that template", "this approach worked great")

Skip:
  - Pleasantries / acknowledgments
  - Anything already obviously visible from the live database (current pipeline counts, status of an app)
  - Generic advice the agent gave back
  - Speculation about what the user might want

If nothing meets the bar, return an empty memories array. Never invent.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface ExtractInput {
  userId: string;
  agent: string;
  /** The user's last message text (raw). */
  userMessage: string;
  /** The agent's final reply text (raw). */
  assistantMessage: string;
  /** Optional one-line summary of tool calls fired during the exchange. */
  toolCallSummary?: string;
}

/**
 * Extract + store memories from a single chat exchange. Returns the number
 * of memories persisted. Always resolves; never throws.
 */
export async function extractAndStoreMemories(
  input: ExtractInput,
): Promise<number> {
  // Skip cheap exchanges — not worth the Haiku call.
  if (
    !input.userMessage ||
    input.userMessage.trim().length < MIN_USER_INPUT_CHARS
  ) {
    return 0;
  }

  const start = Date.now();
  const transcript = buildTranscript(input);

  try {
    const result = await generateText({
      model: getFastModel(),
      system: EXTRACTION_SYSTEM,
      prompt: transcript,
      output: Output.object({ schema: ExtractionSchema }),
      // Memory extraction never needs tools or multi-step.
    });

    const extracted = result.output?.memories ?? [];
    let stored = 0;

    for (const memory of extracted) {
      const row = await storeAgentMemory({
        userId: input.userId,
        agent: input.agent,
        category: memory.category,
        content: memory.content,
        importance: memory.importance,
      });
      if (row) stored++;
    }

    // Log the extraction itself so the CFO floor can see the cost of the
    // memory pipeline separately from the user-facing chat.
    void recordAgentRun({
      userId: input.userId,
      agent: input.agent,
      action: "memory.extract",
      modelId: FAST_MODEL_ID,
      usage: result.usage,
      durationMs: Date.now() - start,
      inputSummary: `Extract from ${input.userMessage.slice(0, 80)}`,
      outputSummary: `Stored ${stored}/${extracted.length} memories`,
    });

    return stored;
  } catch (err) {
    log.warn("ai.memory.extraction_failed", {
      agent: input.agent,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Compose a compact transcript for the extractor. We deliberately avoid
 * dumping the full system prompt — only the live exchange.
 */
function buildTranscript(input: ExtractInput): string {
  const tool = input.toolCallSummary
    ? `\n[tool calls: ${input.toolCallSummary}]`
    : "";
  return [
    `Agent: ${input.agent.toUpperCase()}`,
    `User said: ${input.userMessage.trim()}${tool}`,
    `${input.agent.toUpperCase()} replied: ${input.assistantMessage.trim().slice(0, 1200)}`,
  ].join("\n\n");
}
