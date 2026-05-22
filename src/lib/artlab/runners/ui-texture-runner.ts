// src/lib/artlab/runners/ui-texture-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UI_TEXTURE_CONTRACT } from "@/lib/artlab/contracts/ui-texture-contract";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const DEFAULT_COMBOS = [
  { surface: "button" as const, state: "default" as const },
  { surface: "button" as const, state: "hover" as const },
  { surface: "card" as const, state: "default" as const },
];

export const uiTextureRunner: ArtLabRunner = {
  kind: "production",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    // SPEED: combo parallelism
    const slotOutputs = await Promise.all(
      DEFAULT_COMBOS.map(async (combo) => {
        const slotId = `${combo.surface}-${combo.state}`;
        const path = join(dir, `${slotId}.json`);
        writeFileSync(path, JSON.stringify({
          slotId,
          surface: combo.surface,
          state: combo.state,
          tileable: UI_TEXTURE_CONTRACT.tileable,
          maxWidth: UI_TEXTURE_CONTRACT.maxWidth,
          mock: true,
        }));
        return path;
      }),
    );
    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs: slotOutputs.sort(), slotCount: slotOutputs.length },
    };
  },
};
