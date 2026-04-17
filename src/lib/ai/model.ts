/**
 * Centralised model factory.
 *
 * Strategy:
 *   - When `AI_GATEWAY_API_KEY` is set, route every model call through Vercel AI
 *     Gateway using `provider/model` strings (e.g. `"anthropic/claude-sonnet-4-6"`).
 *     Gateway gives us automatic provider failover, per-request cost tracking,
 *     and unified analytics tags.
 *   - When the env var is missing (local dev with only a direct provider key),
 *     fall back to the direct `@ai-sdk/anthropic` provider so the app stays
 *     functional without Gateway provisioning.
 *
 * The exported helpers are the **only** sanctioned way to obtain a LanguageModel
 * inside the AI tree — every `streamText`/`generateText` call should use them.
 *
 * Why a helper instead of a constant: model selection may eventually depend on
 * the agent (Haiku for routing, Opus for prose). The current implementation
 * returns a single Sonnet model for every key, but the call site doesn't have
 * to know — switching model assignment is a one-file change.
 */

import { gateway } from "ai";
import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// ---------------------------------------------------------------------------
// Model identifiers
// ---------------------------------------------------------------------------
/**
 * Gateway "provider/model" string used as the canonical identifier across the
 * stack — we also pass it as `agent_logs.action` metadata so cost reporting can
 * tie a row back to a specific model.
 */
export const PRIMARY_MODEL_ID = "anthropic/claude-sonnet-4-6" as const;
/** Fast / cheap model used for memory summarisation. */
export const FAST_MODEL_ID = "anthropic/claude-haiku-4-5" as const;

// Mirror identifiers when AI Gateway is unavailable (direct Anthropic SDK
// expects the bare model name without provider prefix).
const PRIMARY_MODEL_BARE = "claude-sonnet-4-6";
const FAST_MODEL_BARE = "claude-haiku-4-5";

// ---------------------------------------------------------------------------
// Gateway detection
// ---------------------------------------------------------------------------
/**
 * Returns true when AI Gateway is configured. We also accept the
 * `VERCEL_AI_GATEWAY_API_KEY` alias used by some deployments.
 */
function isGatewayEnabled(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Default chat model for every C-suite agent.
 *
 * Returns the Gateway-routed Sonnet 4.6 when Gateway is configured (preferred —
 * gives us failover + cost analytics), otherwise the direct Anthropic provider.
 */
export function getAgentModel(): LanguageModel {
  if (isGatewayEnabled()) {
    return gateway(PRIMARY_MODEL_ID);
  }
  return anthropic(PRIMARY_MODEL_BARE);
}

/**
 * Fast model used for non-user-facing background work (memory summarisation,
 * classification). Cheaper + lower-latency than the agent model.
 */
export function getFastModel(): LanguageModel {
  if (isGatewayEnabled()) {
    return gateway(FAST_MODEL_ID);
  }
  return anthropic(FAST_MODEL_BARE);
}

/**
 * Resolve the canonical model identifier currently in use. Used by cost
 * tracking (so per-row rates stay coupled to the model that actually ran).
 */
export function getActiveModelId(): string {
  return PRIMARY_MODEL_ID;
}
