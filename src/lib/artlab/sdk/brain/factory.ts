import { createCharacterMasterBrain } from "./agents/character-master-brain";
import { createFloorEnvironmentBrain } from "./agents/floor-environment-brain";
import { createUiTextureBrain } from "./agents/ui-texture-brain";
import { createSpriteAnimatorBrain } from "./agents/sprite-animator-brain";
import { resolveFoundryAgentProvider } from "./provider-registry";
import type { FoundryAgentBrain, FoundryAgentKind } from "./types";

export function createFoundryBrainFor(
  kind: FoundryAgentKind,
  env: Record<string, string | undefined>,
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- factory unions; callers narrow at use site
): FoundryAgentBrain<any, any> {
  const cfg = resolveFoundryAgentProvider({ agent: kind }, env);
  switch (kind) {
    case "character-master":
      return createCharacterMasterBrain({ apiKey: cfg.apiKey, model: cfg.model, dryRun: cfg.dryRun });
    case "floor-environment":
      return createFloorEnvironmentBrain({ apiKey: cfg.apiKey, model: cfg.model, dryRun: cfg.dryRun });
    case "ui-texture":
      return createUiTextureBrain({ apiKey: cfg.apiKey, model: cfg.model, dryRun: cfg.dryRun });
    case "sprite-animator":
      return createSpriteAnimatorBrain({ apiKey: cfg.apiKey, model: cfg.model, dryRun: cfg.dryRun });
    default: {
      // Exhaustiveness check — unreachable in TypeScript, throws at runtime.
      const exhaustive: never = kind;
      throw new Error(`unknown foundry agent kind at runtime: ${String(exhaustive)}`);
    }
  }
}
