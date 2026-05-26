import { buildFoundryAssetPack } from "@/lib/artlab/sdk/asset-pack";
import { loadFoundryFloorCanonEntry } from "./floor-canon";
import { fanOutFoundryFloorVariants } from "./stages/variant-fanout";
import { buildFoundryFloorComposite } from "./stages/layer-separation";
import { runFoundryFloorQa } from "./qa";
import { writeFoundryFloorPack } from "./pack-writer";
import { renderFoundryFloorIntegrationSnippet } from "./integration";
import {
  FoundryFloorEnvironmentInputSchema,
  type FoundryFloorEnvironmentInput,
  type FoundryFloorManifestGaps,
} from "./types";
import type { FoundryImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";

export interface FoundryFloorAgentContext {
  runDir: string;
}

export interface FoundryFloorAgentResult {
  packId: string;
  manifest: Record<string, unknown>;
}

export async function runFoundryFloorEnvironment(
  rawInput: FoundryFloorEnvironmentInput,
  provider: FoundryImageProvider,
  context: FoundryFloorAgentContext,
): Promise<FoundryFloorAgentResult> {
  const input = FoundryFloorEnvironmentInputSchema.parse(rawInput);
  const canon = await loadFoundryFloorCanonEntry(input.floorSlug);
  const jobs = fanOutFoundryFloorVariants(canon, input.timeStates);
  const variants = await Promise.all(
    jobs.map(async (job) => {
      const result = await provider.generateImage({
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
        seed: input.seed,
      });
      const composite = await buildFoundryFloorComposite(result.bytes);
      return {
        timeState: job.timeState,
        compositeBytes: result.bytes,
        kind: composite.kind,
        layers: composite.layers,
      };
    }),
  );
  const qa = await runFoundryFloorQa({
    canonPalette: canon.palette,
    requiredElements: canon.requiredElements,
    variants: variants.map((v) => ({
      timeState: v.timeState,
      bytes: v.compositeBytes,
    })),
  });
  if (!qa.passed) {
    throw new Error(
      `foundry/floor: qa failed for ${input.floorSlug} — gates=${qa.failedGates.join(",")}`,
    );
  }
  const persisted = await writeFoundryFloorPack({
    runDir: context.runDir,
    floorSlug: input.floorSlug,
    variants: variants.map((v) => ({
      timeState: v.timeState,
      kind: v.kind,
      layers: v.layers,
    })),
  });
  const integrationSnippet = renderFoundryFloorIntegrationSnippet({
    floorSlug: input.floorSlug,
    packPath: persisted.packRoot,
  });
  // Critical 2 followup: surface known SDK-level gaps at the manifest
  // root so downstream consumers (telegram bot, daemon UI, structured
  // logs) can branch on them without having to dig into the qa block.
  // Two gaps are documented:
  //  - room-element pixel verification (no vision-LLM call yet)
  //  - per-layer renders (currently single composite; see Critical 1+4)
  const manifestGaps: FoundryFloorManifestGaps = {
    roomElementsPixelVerification: {
      status: "todo-post-launch",
      reason:
        "no vision-LLM call yet — required elements declared in canon are not verified against pixels",
    },
    perLayerRenders: {
      status: "out-of-scope-for-sdk-launch",
      reason:
        "single composite per variant; independent per-layer renders are a future option (see Critical 1+4 commit)",
    },
  };
  const manifest = {
    __packDir: context.runDir,
    assetKind: "floor-environment" as const,
    floor: input.floorSlug,
    aspectRatio: canon.aspectRatio,
    timeStates: input.timeStates,
    compositeKind: "single-composite" as const,
    variants: persisted.variantManifests,
    palette: canon.palette,
    requiredElements: canon.requiredElements,
    manifestGaps,
    integrationSnippet,
    qa,
  };
  return buildFoundryAssetPack(manifest);
}
