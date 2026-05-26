import type { ArtLabImageProvider } from "@/lib/artlab/sdk/providers/types";
import type { ConceptLane } from "./concept-board";

export interface CharacterVariantSprite {
  characterId: string;
  outfit: string;
  pose: string;
  bytes: Buffer;
  widthPx: number;
  heightPx: number;
  prompt: string;
}

export interface VariantFanOutStageInput {
  anchor: ConceptLane;
  characterId: string;
  provider: ArtLabImageProvider;
  outfits: readonly string[];
  poses: readonly string[];
  seed?: number;
}

export interface VariantFanOutStageResult {
  sprites: readonly CharacterVariantSprite[];
  durationMs: number;
}

function buildVariantPrompt(anchorPrompt: string, outfit: string, pose: string): string {
  return [
    `Reference image: identity-anchor for ${anchorPrompt}`,
    `Match the anchor identity exactly: face, hair, body proportions, age impression.`,
    `Apply outfit variant: ${outfit}.`,
    `Apply pose / expression state: ${pose}.`,
    `Style envelope: tower-flat-plus-depth-v1. Full-body app-sprite framing.`,
  ].join("\n");
}

const MAX_PARALLELISM = 5;

async function runWithConcurrencyLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await tasks[idx]!();
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runVariantFanOutStage(input: VariantFanOutStageInput): Promise<VariantFanOutStageResult> {
  const start = performance.now();
  type Pair = { outfit: string; pose: string };
  const pairs: Pair[] = [];
  for (const outfit of input.outfits) {
    for (const pose of input.poses) {
      pairs.push({ outfit, pose });
    }
  }
  const tasks: Array<() => Promise<CharacterVariantSprite>> = pairs.map((p, idx) => async () => {
    const prompt = buildVariantPrompt(input.anchor.prompt, p.outfit, p.pose);
    const result = await input.provider.generate({
      prompt,
      aspectRatio: "9:16",
      laneIndex: idx + 1,
      referenceImageBytes: input.anchor.bytes,
      seed: input.seed,
    });
    return {
      characterId: input.characterId,
      outfit: p.outfit,
      pose: p.pose,
      bytes: result.bytes,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
      prompt,
    };
  });
  const sprites = await runWithConcurrencyLimit(tasks, MAX_PARALLELISM);
  return { sprites, durationMs: Math.round(performance.now() - start) };
}
