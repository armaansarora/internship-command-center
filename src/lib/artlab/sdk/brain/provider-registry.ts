import type { ArtLabAgentKind } from "./types";

export const DEFAULT_ARTLAB_AGENT_MODEL = "claude-opus-4-7";

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
  return {
    agent: args.agent,
    model,
    apiKey,
    dryRun: apiKey === "",
  };
}
