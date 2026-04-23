/**
 * Per-model cost computation in cents.
 *
 * The AI SDK v6 `usage` object reports:
 *   - `inputTokens` — total input (prompt) tokens
 *   - `outputTokens` — total output (completion) tokens
 *   - `inputTokenDetails.noCacheTokens` — fresh input not served from cache
 *   - `inputTokenDetails.cacheReadTokens` — cached prompt tokens read
 *   - `inputTokenDetails.cacheWriteTokens` — cached prompt tokens written
 *
 * Anthropic prompt-caching pricing:
 *   - Cache reads cost ~10% of regular input.
 *   - Cache writes cost ~125% of regular input (5m TTL) or ~200% (1h TTL).
 * We assume the cheaper 5m TTL (matches `cacheControl: { type: "ephemeral" }`
 * defaults). Writes are billed slightly above input rate.
 *
 * Result is rounded to two decimals and stored in `agent_logs.cost_cents`
 * (numeric(10, 2)).
 */

import type { LanguageModelUsage } from "ai";

interface ModelRates {
  /** USD per 1M input tokens (fresh, not cached). */
  inputPerMillion: number;
  /** USD per 1M output tokens. */
  outputPerMillion: number;
  /** USD per 1M cached-read tokens (Anthropic prompt-cache hit). */
  cachedReadPerMillion: number;
  /** USD per 1M cached-write tokens (Anthropic prompt-cache write, 5m TTL). */
  cachedWritePerMillion: number;
}

// ---------------------------------------------------------------------------
// Rate cards (USD per million tokens) — sourced from public pricing pages
// (Apr 2026). Update annually or when migrating models.
// ---------------------------------------------------------------------------
const RATES: Record<string, ModelRates> = {
  // Anthropic Claude Sonnet 4.6 — the primary agent model.
  "anthropic/claude-sonnet-4-6": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cachedReadPerMillion: 0.3,
    cachedWritePerMillion: 3.75,
  },
  // Anthropic Claude Haiku 4.5 — fast cheap model for memory extraction.
  "anthropic/claude-haiku-4-5": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cachedReadPerMillion: 0.08,
    cachedWritePerMillion: 1.0,
  },
  // Anthropic Claude Opus 4.6 — premium prose model (not yet wired but priced
  // for forward-compat).
  "anthropic/claude-opus-4-6": {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    cachedReadPerMillion: 1.5,
    cachedWritePerMillion: 18.75,
  },
  // OpenAI GPT-5 — fallback for AI Gateway. Rates are preview-window
  // estimates; confirm against production pricing when the model GAs.
  "openai/gpt-5": {
    inputPerMillion: 5.0,
    outputPerMillion: 15.0,
    cachedReadPerMillion: 1.25,
    cachedWritePerMillion: 5.0,
  },
  // Google Gemini 3.1 Pro Preview — fallback for AI Gateway. Preview rates.
  "google/gemini-3-1-pro-preview": {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
    cachedReadPerMillion: 0.31,
    cachedWritePerMillion: 1.5,
  },
};

const DEFAULT_RATES: ModelRates = RATES["anthropic/claude-sonnet-4-6"];

/**
 * Compute the cost of a single LLM call in cents. Always non-negative; falls
 * back to Sonnet rates for unknown model strings (safer to over-estimate than
 * to silently log $0).
 */
export function computeCostCents(
  modelId: string,
  usage: LanguageModelUsage | undefined,
): number {
  if (!usage) return 0;

  const rates = RATES[modelId] ?? DEFAULT_RATES;

  // v6 split: total inputTokens, plus a details object that breaks them into
  // no-cache / cache-read / cache-write. When details are absent (older
  // providers / fallback path), assume all input was fresh.
  const totalInputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  // Prefer the explicit no-cache count; otherwise back-compute it (clamp at 0
  // because some providers double-count).
  const noCacheTokens =
    usage.inputTokenDetails?.noCacheTokens ??
    Math.max(0, totalInputTokens - cacheReadTokens - cacheWriteTokens);

  const inputUsd = (noCacheTokens / 1_000_000) * rates.inputPerMillion;
  const outputUsd = (outputTokens / 1_000_000) * rates.outputPerMillion;
  const cachedReadUsd = (cacheReadTokens / 1_000_000) * rates.cachedReadPerMillion;
  const cachedWriteUsd = (cacheWriteTokens / 1_000_000) * rates.cachedWritePerMillion;

  const totalUsd = inputUsd + outputUsd + cachedReadUsd + cachedWriteUsd;
  // Cents at 2-decimal precision so it slots into the numeric(10, 2) column
  // without a scale violation. Round to 4 decimals first (sub-cent precision)
  // then to 2 — keeps tiny exchanges from rounding to 0.
  const rounded = Math.round(totalUsd * 10000) / 10000;
  return Math.round(rounded * 100 * 100) / 100;
}
