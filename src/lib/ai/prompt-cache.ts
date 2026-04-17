/**
 * Anthropic prompt-caching wiring.
 *
 * Each agent's system prompt is composed of three layers:
 *
 *   LAYER 1 — Identity (immutable)
 *   LAYER 2 — Behavioral rules (immutable)
 *   LAYER 3 — Dynamic context (per-request: pipeline stats, memories, user name)
 *
 * Layers 1+2 are identical across every request for a given agent — perfect
 * cache candidates. Layer 3 changes every call so we never want it cached.
 *
 * AI SDK v6 caveat: `SystemModelMessage.content` is typed as `string` only —
 * it does NOT accept content-part arrays, so per-block cache markers aren't
 * representable on a single system message. To still mark the stable prefix
 * cacheable we emit TWO system messages back-to-back:
 *
 *   1. LAYER 1 + 2 (stable)  — providerOptions.anthropic.cacheControl:ephemeral
 *   2. LAYER 3 (dynamic)     — no cache marker
 *
 * Anthropic concatenates multiple system messages for the provider call, and
 * the cacheControl on the first one applies to the prefix of the joined
 * system prompt up through that point. When the input is too short to split
 * cleanly (no LAYER 3 marker), we fall back to caching the whole string as a
 * single system message — still a win for repeat calls within the same
 * session.
 *
 * Cost impact: cache reads are billed at ~10% of input rate, and cache writes
 * at ~125% of input. After the first chat turn for a given agent, every
 * subsequent turn pays only the read rate on L1+L2 (typically 70-90% of the
 * total system prompt) — net 60-90% reduction in input spend.
 *
 * Reference: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */

import type { ModelMessage } from "ai";

/**
 * The marker every `buildXxxSystemPrompt` writer in `src/lib/agents/*` uses
 * between LAYER 2 (rules) and LAYER 3 (live context). Splitting on this
 * keyword lets us isolate the cacheable prefix without changing the prompt
 * builders.
 */
const DYNAMIC_LAYER_MARKER = /\n\n(LIVE [A-Z][^\n]*:|LIVE C-SUITE)/;

/**
 * Split a multi-layer system prompt into cached + fresh parts.
 * Returns the indices in the original string.
 */
function splitAtDynamicLayer(systemPrompt: string): {
  cached: string;
  fresh: string;
} | null {
  const match = systemPrompt.match(DYNAMIC_LAYER_MARKER);
  if (!match || typeof match.index !== "number") return null;

  const splitIdx = match.index;
  const cached = systemPrompt.slice(0, splitIdx).trimEnd();
  const fresh = systemPrompt.slice(splitIdx).trimStart();

  // Only split if both halves are substantial — otherwise the cache write
  // overhead would exceed the read savings.
  if (cached.length < 200 || fresh.length < 50) return null;
  return { cached, fresh };
}

/**
 * Convert a system prompt string into a pair of `system`-role messages with
 * Anthropic prompt-caching enabled on the stable LAYER 1+2 prefix.
 *
 * Usage:
 *   const messages = [
 *     ...buildCachedSystemMessages(systemPrompt),
 *     ...modelMessages,
 *   ];
 *   streamText({ messages, ... });
 */
export function buildCachedSystemMessages(
  systemPrompt: string,
): ModelMessage[] {
  const split = splitAtDynamicLayer(systemPrompt);

  if (!split) {
    // Single-block cache. Still useful for short prompts that lack a clean
    // L2/L3 boundary.
    return [
      {
        role: "system",
        content: systemPrompt,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
    ];
  }

  return [
    // LAYER 1 + 2: identity + rules. Stable across every request for this
    // agent → cached at this breakpoint. Anthropic treats the cumulative
    // system content up to this point as the cache key.
    {
      role: "system",
      content: split.cached,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
    // LAYER 3: dynamic context. Fresh every request → no cache marker.
    {
      role: "system",
      content: split.fresh,
    },
  ];
}

/**
 * Helper that returns the same payload shape but typed for `generateText` /
 * sub-agent calls that take a `system` string OR a structured prompt. We
 * just expose the array so a caller can spread it into `messages`.
 */
export function getCachedSystem(systemPrompt: string): string {
  // For sub-agent `generateText` calls we currently fall back to a plain
  // system string — the v6 API for nested calls accepts a string most
  // ergonomically. Caching still applies via the providerOptions on the
  // outer streamText. If we later need per-subagent cache hits we can
  // promote this to the message-array form.
  return systemPrompt;
}
