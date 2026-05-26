import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { runFoundryFloorEnvironment } from "./index";
import { createFoundryFloorMockProvider } from "./__tests__/mock-provider";
import {
  FoundryFloorEnvironmentInputSchema,
  FOUNDRY_FLOOR_TIME_STATES,
} from "./types";
import type { FoundryImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";
import { loadFoundryFloorCanonEntry } from "./floor-canon";

export interface FoundryFloorCliInput {
  floorSlug: string;
  runDir?: string;
  /**
   * Critical 2 (theatrical QA): `reportedElements` was a free-text input
   * that drove a string-comparison "room elements" gate. It never
   * verified the image. The field is preserved as an OPTIONAL no-op for
   * CLI backward compatibility but the orchestrator no longer reads it.
   * It will be removed once external callers (telegram bot, scripts)
   * stop sending it.
   */
  reportedElements?: ReadonlyArray<string>;
  seed?: number;
  providerKind: "mock" | "gemini";
  dryRun?: boolean;
}

export interface FoundryFloorCliResult {
  summary: string;
  runDir: string;
  packId?: string;
}

function pickProvider(
  kind: FoundryFloorCliInput["providerKind"],
): FoundryImageProvider {
  if (kind === "mock") return createFoundryFloorMockProvider();
  throw new Error(
    `foundry/floor cli: provider kind ${kind} not yet wired — use mock until a real adapter is registered`,
  );
}

export async function runFoundryFloorCli(
  input: FoundryFloorCliInput,
): Promise<FoundryFloorCliResult> {
  const runDir =
    input.runDir ?? mkdtempSync(join(tmpdir(), "foundry-floor-run-"));
  const parsed = FoundryFloorEnvironmentInputSchema.parse({
    runId: randomUUID(),
    floorSlug: input.floorSlug,
    requestedBy: "cli",
    timeStates: [...FOUNDRY_FLOOR_TIME_STATES],
    seed: input.seed,
  });
  if (input.dryRun) {
    const canon = await loadFoundryFloorCanonEntry(parsed.floorSlug);
    return {
      summary: `floor ${parsed.floorSlug} validated (${canon.requiredElements.length} required elements, ${parsed.timeStates.length} time-states)`,
      runDir,
    };
  }
  const provider = pickProvider(input.providerKind);
  const result = await runFoundryFloorEnvironment(parsed, provider, {
    runDir,
  });
  return {
    summary: `floor ${parsed.floorSlug} pack ${result.packId} validated, ${parsed.timeStates.length} variants written`,
    runDir,
    packId: result.packId,
  };
}
