import type { FoundryAgentKind } from "./types";

export const DEFAULT_FOUNDRY_AGENT_MODEL = "claude-opus-4-7";

const PER_AGENT_ENV: Record<FoundryAgentKind, string> = {
  "character-master": "FOUNDRY_BRAIN_MODEL_CHARACTER_MASTER",
  "floor-environment": "FOUNDRY_BRAIN_MODEL_FLOOR_ENVIRONMENT",
  "ui-texture": "FOUNDRY_BRAIN_MODEL_UI_TEXTURE",
  "sprite-animator": "FOUNDRY_BRAIN_MODEL_SPRITE_ANIMATOR",
};

export interface FoundryAgentProviderConfig {
  agent: FoundryAgentKind;
  model: string;
  apiKey: string;
  dryRun: boolean;
}

export function resolveFoundryAgentProvider(
  args: { agent: FoundryAgentKind },
  env: Record<string, string | undefined>,
): FoundryAgentProviderConfig {
  const perAgentKey = PER_AGENT_ENV[args.agent];
  const perAgentModel = env[perAgentKey];
  const globalModel = env.FOUNDRY_BRAIN_MODEL;
  const model = perAgentModel ?? globalModel ?? DEFAULT_FOUNDRY_AGENT_MODEL;
  const apiKey = env.ANTHROPIC_API_KEY ?? "";
  return {
    agent: args.agent,
    model,
    apiKey,
    dryRun: apiKey === "",
  };
}
