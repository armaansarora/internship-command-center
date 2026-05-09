/**
 * Anthropic prompt-caching wiring — the four-case ladder.
 *
 * Each agent's system prompt is composed of layers we want cached at
 * different lifetimes:
 *
 *   LAYER 0 — BASE_SCAFFOLD (immutable, shared by all 8 C-suite characters)
 *   LAYER 1 — Character identity (immutable, per-character)
 *   LAYER 2 — Behavioral rules (immutable, per-character)
 *   LAYER 3 — Dynamic context (per-request: pipeline stats, memories, name)
 *
 * Anthropic supports up to 4 cache breakpoints. We use TWO:
 *
 *   Breakpoint 1 — at the end of LAYER 0 (BASE_SCAFFOLD).
 *     Hits across every C-suite agent in the same session: switching from
 *     CRO to CEO inside the 5-min TTL pays only ~10% of the input rate
 *     on the scaffold.
 *
 *   Breakpoint 2 — at the end of LAYER 2 (just before LAYER 3).
 *     Hits across every turn within the same agent: re-asking the same
 *     character pays only the read rate on identity+rules.
 *
 * AI SDK v6 caveat: `SystemModelMessage.content` is typed as `string` only,
 * so per-block cache markers aren't representable on a single system
 * message. Instead we emit MULTIPLE system messages back-to-back, each
 * carrying its own `providerOptions.anthropic.cacheControl`. Anthropic
 * concatenates the system messages and treats the cumulative content up
 * to each marked message as that breakpoint's cache key.
 *
 * The four cases:
 *
 *   Case A — both BASE and dynamic boundaries present:
 *     [base | identity+rules | dynamic]   3 messages, 2 breakpoints.
 *     This is the path for the 8 C-suite characters.
 *
 *   Case B — BASE boundary present, no dynamic boundary:
 *     [base | rest]                       2 messages, 2 breakpoints.
 *     Rare. A C-suite prompt with no LAYER 3.
 *
 *   Case C — only dynamic boundary present (LEGACY):
 *     [identity+rules | dynamic]          2 messages, 1 breakpoint.
 *     Concierge falls here once `CURRENT CONTEXT\n` is in the regex.
 *
 *   Case D — neither boundary:
 *     [whole prompt]                      1 message, 1 breakpoint.
 *     Offer Evaluator and any short prompt.
 *
 * MARKER STRIPPING: when a base split fires, the `BASE_CACHE_MARKER`
 * itself is consumed by the slice — outgoing message content NEVER
 * contains the sentinel. Tested in `prompt-cache.test.ts`.
 *
 * FEATURE FLAG: `process.env.TOWER_PROMPT_CACHE_LAYOUT === "legacy"`
 * forces `baseSplit = null`, reproducing the pre-Fix-#4 single-breakpoint
 * behavior. Set this Vercel env to roll back without code revert.
 *
 * Cost reference: cache reads are billed at ~10% of input rate, cache
 * writes at ~125%. Anthropic Sonnet 4.6 requires cumulative content >=
 * 1024 tokens at a breakpoint to actually cache; BASE_SCAFFOLD is sized
 * accordingly.
 *
 * Reference: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */

import type { ModelMessage } from "ai";
import { BASE_CACHE_MARKER } from "@/lib/agents/base-scaffold";

/**
 * Anchor that marks the start of LAYER 3 (dynamic context) in every
 * `buildXxxSystemPrompt` writer in `src/lib/agents/*`.
 *
 * Patterns we recognize:
 *   - `LIVE PIPELINE SNAPSHOT:` (CRO)
 *   - `LIVE FINANCIAL DASHBOARD:` (CFO)
 *   - `LIVE C-SUITE DASHBOARD` (CEO — no trailing colon)
 *   - `LIVE …` for every other C-suite floor.
 *   - `CURRENT CONTEXT\n` (Otis / Concierge — added in Fix #4 so Otis
 *     benefits from a 2-message split with no content change).
 */
const DYNAMIC_LAYER_MARKER = /\n\n(LIVE [A-Z][^\n]*:|LIVE C-SUITE|CURRENT CONTEXT\n)/;

/**
 * Result of finding the BASE_SCAFFOLD/character boundary.
 *
 * `base` is the substring BEFORE the marker — preserved byte-for-byte so
 * it stays identical across every C-suite character. `rest` is everything
 * AFTER the marker — the per-character prompt body.
 *
 * Returns `null` when:
 *   - The marker is not in the prompt (Concierge, Offer Evaluator).
 *   - The base is implausibly short (<200 chars) — splitting tiny
 *     prefixes wastes a cache breakpoint.
 */
function splitAtBaseBoundary(
  s: string,
): { base: string; rest: string } | null {
  const idx = s.indexOf(BASE_CACHE_MARKER);
  if (idx < 0) return null;

  const base = s.slice(0, idx);
  const rest = s.slice(idx + BASE_CACHE_MARKER.length);

  if (base.length < 200) return null;
  return { base, rest };
}

/**
 * Find the LAYER 2 → LAYER 3 boundary. Returns `null` when either half
 * would be too small to justify a cache breakpoint.
 */
function splitAtDynamicLayer(
  systemPrompt: string,
): { cached: string; fresh: string } | null {
  const match = systemPrompt.match(DYNAMIC_LAYER_MARKER);
  if (!match || typeof match.index !== "number") return null;

  const splitIdx = match.index;
  const cached = systemPrompt.slice(0, splitIdx).trimEnd();
  const fresh = systemPrompt.slice(splitIdx).trimStart();

  if (cached.length < 200 || fresh.length < 50) return null;
  return { cached, fresh };
}

/**
 * Convert a system-prompt string into 1, 2, or 3 `system`-role messages
 * with Anthropic prompt-cache markers placed at the correct boundaries.
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
  // Feature flag: set TOWER_PROMPT_CACHE_LAYOUT=legacy on Vercel to fall
  // back to the pre-Fix-#4 single-breakpoint behavior. This pretends the
  // BASE marker isn't there and reproduces the old code behavior.
  const layoutEnabled =
    process.env.TOWER_PROMPT_CACHE_LAYOUT !== "legacy";

  const baseSplit = layoutEnabled ? splitAtBaseBoundary(systemPrompt) : null;
  // After the BASE split (if it fired), look for the dynamic boundary in
  // the REST half — never the original prompt — so the dyn marker can't
  // fire inside the BASE prefix.
  const sourceForDyn = baseSplit ? baseSplit.rest : systemPrompt;
  const dynSplit = splitAtDynamicLayer(sourceForDyn);

  // Case A: both boundaries — [base | identity+rules | dynamic]
  if (baseSplit && dynSplit) {
    return [
      {
        role: "system",
        content: baseSplit.base.trimEnd(),
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "system",
        content: dynSplit.cached,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "system",
        content: dynSplit.fresh,
      },
    ];
  }

  // Case B: only BASE — [base | rest]
  if (baseSplit && !dynSplit) {
    return [
      {
        role: "system",
        content: baseSplit.base.trimEnd(),
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "system",
        content: baseSplit.rest.trimStart(),
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
    ];
  }

  // Case C: only dynamic — [cached | fresh]
  // Concierge (Otis) falls here once `CURRENT CONTEXT\n` is in the regex.
  if (!baseSplit && dynSplit) {
    return [
      {
        role: "system",
        content: dynSplit.cached,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "system",
        content: dynSplit.fresh,
      },
    ];
  }

  // Case D: neither — single block, fully cached.
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

/**
 * @deprecated Returns a plain string — provider options never reach the
 * model. Use `buildCachedSystemMessages(...)` and spread the result into
 * a `messages` array instead.
 *
 * Kept temporarily so any remaining callers don't break during the
 * rollout window. The orchestrator's `runSubagent` was migrated to the
 * message form in Fix #4; remaining callers should follow.
 */
export function getCachedSystem(systemPrompt: string): string {
  return systemPrompt;
}
