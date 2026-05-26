import type { FoundryCharacterCanon } from "@/lib/foundry/canon";
import type { FoundryImageProvider } from "@/lib/foundry/providers/types";

export interface ConceptLane {
  laneIndex: number;
  characterId: string;
  variationAxis: string;
  prompt: string;
  bytes: Buffer;
  widthPx: number;
  heightPx: number;
}

export interface ConceptBoardStageInput {
  character: FoundryCharacterCanon;
  provider: FoundryImageProvider;
  seed?: number;
}

export interface ConceptBoardStageResult {
  lanes: readonly ConceptLane[];
  durationMs: number;
}

const VARIATION_AXES = [
  "silhouette-tighter",
  "age-impression-younger",
  "hair-volume-controlled",
  "wardrobe-tone-shifted",
  "accessory-emphasis",
] as const;

function buildLanePrompt(character: FoundryCharacterCanon, axis: string): string {
  return [
    `Tower flat-plus-depth-v1 style.`,
    `Character: ${character.displayName} (${character.title}).`,
    `Archetype: ${character.visualArchetype}.`,
    `Silhouette: ${character.silhouette}.`,
    `Wardrobe: ${character.wardrobe}.`,
    `Mobile read: ${character.mobileRead}.`,
    `Negative DNA: ${character.negativeDNA}.`,
    `Accent: ${character.accent}.`,
    `Variation axis for this lane: ${axis}.`,
    `Full-body app-sprite framing, controlled Tower lighting, neutral backdrop.`,
  ].join("\n");
}

export async function runConceptBoardStage(input: ConceptBoardStageInput): Promise<ConceptBoardStageResult> {
  const start = performance.now();
  const lanes: ConceptLane[] = [];
  const tasks = VARIATION_AXES.map((axis, i) => async (): Promise<void> => {
    const prompt = buildLanePrompt(input.character, axis);
    const result = await input.provider.generate({
      prompt,
      aspectRatio: "9:16",
      laneIndex: i + 1,
      seed: input.seed,
    });
    lanes.push({
      laneIndex: i + 1,
      characterId: input.character.header.id,
      variationAxis: axis,
      prompt,
      bytes: result.bytes,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
    });
  });

  await Promise.all(tasks.map((t) => t()));
  lanes.sort((a, b) => a.laneIndex - b.laneIndex);

  return { lanes, durationMs: Math.round(performance.now() - start) };
}
