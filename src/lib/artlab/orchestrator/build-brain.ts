// src/lib/artlab/orchestrator/build-brain.ts
//
// Single source of truth for constructing the ArtLab orchestrator brain.
// Previously this logic was copy-pasted into five buildBrain() functions
// (brief / concept / production / promotion runners + bot/commands ask
// handler), each defaulting to PAID Claude Opus via the Anthropic API. That
// default was the silent token sink behind the "$50 for two characters"
// surprise.
//
// New policy — FREE by default:
//   • Gemini brain (reuses the same free Google AI Studio key the image
//     generator uses) is the default. $0 on the free tier.
//   • Claude via Claude Max OAuth subscription (CLAUDE_CODE_OAUTH_TOKEN, from
//     `claude setup-token`) — best quality, $0 incremental within the plan —
//     when ARTLAB_BRAIN_PROVIDER=claude-oauth, or as the auto pick when an
//     OAuth token is present but no Gemini key is.
//   • Claude via the Anthropic API (PAID) only when ARTLAB_BRAIN_PROVIDER=claude
//     or as the last resort when it's the only credential available.
//   • mock when no key/token is available.
//
// Both Claude paths keep a transparent Gemini fallback so a stale/blocked
// Claude credential degrades to the free brain instead of failing the run.

import { createClaudeBrain } from "./claude-brain";
import { createGeminiBrain } from "./gemini-brain";
import { createLoggedBrain } from "./logged-brain";
import { decideWithMockBrain, type ArtLabLlmBrain } from "./llm-brain";
import { DEFAULT_ARTLAB_CLAUDE_MODEL } from "../sdk/brain/provider-registry";

export type ArtLabBrainProvider = "gemini" | "claude" | "claude-oauth" | "mock";

function geminiKeyFrom(env: NodeJS.ProcessEnv): string | null {
  return env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith("__") ? env.GEMINI_API_KEY : null;
}

function claudeOAuthTokenFrom(env: NodeJS.ProcessEnv): string | null {
  const token = env.CLAUDE_CODE_OAUTH_TOKEN;
  return token && token.length > 0 ? token : null;
}

function anthropicKeyFrom(env: NodeJS.ProcessEnv): string | null {
  const key = env.ANTHROPIC_API_KEY;
  return key && key.length > 0 ? key : null;
}

/**
 * Decide which brain provider to use. FREE-first: Gemini is preferred unless
 * the operator explicitly opts into a Claude path via ARTLAB_BRAIN_PROVIDER
 * (gemini | claude | claude-oauth). Each explicit choice degrades gracefully
 * to the next-best available credential.
 */
export function resolveBrainProvider(env: NodeJS.ProcessEnv = process.env): ArtLabBrainProvider {
  const explicit = env.ARTLAB_BRAIN_PROVIDER;
  const gemini = geminiKeyFrom(env);
  const oauth = claudeOAuthTokenFrom(env);
  const anthropic = anthropicKeyFrom(env);

  if (explicit === "gemini") return gemini ? "gemini" : "mock";
  if (explicit === "claude-oauth") {
    // Explicitly asked for the SUBSCRIPTION (OAuth). If the token is missing,
    // fall to FREE Gemini — never silently bill the paid Anthropic API just
    // because ANTHROPIC_API_KEY happens to be present. Safe to set this env var
    // BEFORE running `claude setup-token`: you stay free until the token lands.
    return oauth ? "claude-oauth" : gemini ? "gemini" : "mock";
  }
  if (explicit === "claude") {
    return anthropic ? "claude" : oauth ? "claude-oauth" : gemini ? "gemini" : "mock";
  }

  // No explicit override → FREE-first policy.
  if (gemini) return "gemini"; // free tier
  if (oauth) return "claude-oauth"; // subscription, $0 incremental
  if (anthropic) return "claude"; // paid API — last resort
  return "mock";
}

export interface BuildBrainOptions {
  workspaceRoot: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Construct the (logged) brain for the current environment per the FREE-first
 * policy in {@link resolveBrainProvider}.
 */
export function buildArtLabBrain(options: BuildBrainOptions): ArtLabLlmBrain {
  const env = options.env ?? process.env;
  const provider = resolveBrainProvider(env);
  const claudeModel = env.ARTLAB_CLAUDE_MODEL ?? DEFAULT_ARTLAB_CLAUDE_MODEL;
  const geminiBrainModel = env.ARTLAB_GEMINI_BRAIN_MODEL;
  const geminiKey = geminiKeyFrom(env);

  let raw: ArtLabLlmBrain;
  switch (provider) {
    case "gemini":
      raw = createGeminiBrain({ apiKey: geminiKey ?? "", model: geminiBrainModel });
      break;
    case "claude": {
      const claude = createClaudeBrain({ apiKey: anthropicKeyFrom(env) ?? "", model: claudeModel });
      raw = withGeminiFallback(claude, geminiKey, geminiBrainModel);
      break;
    }
    case "claude-oauth": {
      const claude = createClaudeBrain({ oauthToken: claudeOAuthTokenFrom(env) ?? "", model: claudeModel });
      raw = withGeminiFallback(claude, geminiKey, geminiBrainModel);
      break;
    }
    default:
      raw = { decide: decideWithMockBrain };
  }
  return createLoggedBrain({ inner: raw, workspaceRoot: options.workspaceRoot });
}

function withGeminiFallback(
  primary: ArtLabLlmBrain,
  geminiKey: string | null,
  geminiModel: string | undefined,
): ArtLabLlmBrain {
  const fallback = geminiKey ? createGeminiBrain({ apiKey: geminiKey, model: geminiModel }) : null;
  if (!fallback) return primary;
  return {
    async decide(req) {
      try {
        return await primary.decide(req);
      } catch {
        return fallback.decide(req);
      }
    },
  };
}
