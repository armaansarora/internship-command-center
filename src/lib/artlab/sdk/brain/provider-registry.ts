import type { ArtLabAgentKind } from "./types";

export const DEFAULT_ARTLAB_AGENT_MODEL = "claude-opus-4-7";

// Single source of truth for the Anthropic model the ArtLab brain wrappers
// (`buildBrain` in brief-runner / concept-runner / production-runner /
// promotion-runner / bot/commands.ts → `buildAskBrain`) default to when
// `ARTLAB_CLAUDE_MODEL` is unset. Mirrors `DEFAULT_ARTLAB_AGENT_MODEL` —
// both point at the current Anthropic flagship; one constant keeps them
// drift-free across all five call sites.
export const DEFAULT_ARTLAB_CLAUDE_MODEL = "claude-opus-4-7";

// Default Gemini model for the `ArtLabLlmBrain` adapter (`createGeminiBrain`).
// The previous `gemini-3-pro-preview` literal was retired by Google and every
// brain call 404'd — see .artlab/engine/daemon-errors.jsonl entries tagged
// `concept-critique-fallback` before this constant landed. We default to a
// CURRENT GA model that supports the multimodal critique kinds
// (`critique-concept-board` / `critique-production-sprites`).
//
// Choice: `gemini-3.5-flash` — Stable status on Google's catalog (2026-05-27),
// multimodal inputs (Text/Image/Video/Audio/PDF), and faster + cheaper than
// the Pro tiers which are still preview-tier. Override via the
// `ARTLAB_GEMINI_BRAIN_MODEL` env var or the `model` arg to `createGeminiBrain`.
//
// Verified against https://ai.google.dev/gemini-api/docs/models (2026-05-27).
export const DEFAULT_ARTLAB_GEMINI_BRAIN_MODEL = "gemini-3.5-flash";

const PER_AGENT_ENV: Record<ArtLabAgentKind, string> = {
  "character-master": "ARTLAB_BRAIN_MODEL_CHARACTER_MASTER",
  "floor-environment": "ARTLAB_BRAIN_MODEL_FLOOR_ENVIRONMENT",
  "ui-texture": "ARTLAB_BRAIN_MODEL_UI_TEXTURE",
  "sprite-animator": "ARTLAB_BRAIN_MODEL_SPRITE_ANIMATOR",
};

export interface ArtLabAgentProviderConfig {
  agent: ArtLabAgentKind;
  model: string;
  apiKey: string;
  dryRun: boolean;
}

export function resolveArtLabAgentProvider(
  args: { agent: ArtLabAgentKind },
  env: Record<string, string | undefined>,
): ArtLabAgentProviderConfig {
  const perAgentKey = PER_AGENT_ENV[args.agent];
  const perAgentModel = env[perAgentKey];
  const globalModel = env.ARTLAB_BRAIN_MODEL;
  const model = perAgentModel ?? globalModel ?? DEFAULT_ARTLAB_AGENT_MODEL;
  const apiKey = env.ANTHROPIC_API_KEY ?? "";
  // FREE-by-default: the SDK per-agent brain spends on PAID Claude ONLY when the
  // operator explicitly opts in via ARTLAB_BRAIN_PROVIDER=claude|claude-oauth.
  // Otherwise it dry-runs (zero API spend) so an MCP client (Claude Code,
  // Antigravity) calling artlab/generate while ANTHROPIC_API_KEY merely sits in
  // the environment never silently bills Claude Opus. Mirrors the FREE-first
  // policy in orchestrator/build-brain.ts — generation still completes via the
  // FREE runner pipeline; only the optional brain-enrichment hint is skipped.
  const optedIntoClaude =
    env.ARTLAB_BRAIN_PROVIDER === "claude" || env.ARTLAB_BRAIN_PROVIDER === "claude-oauth";
  return {
    agent: args.agent,
    model,
    apiKey,
    dryRun: apiKey === "" || !optedIntoClaude,
  };
}
