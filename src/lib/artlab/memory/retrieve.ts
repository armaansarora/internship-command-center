import type { ArtLabAssetType } from "../types";
import { readStyleWins, type StyleWinEntry } from "./style-ledger";
import { readRejections, type RejectionEntry } from "./rejection-ledger";
import { readPromptEvolution, type PromptEvolutionEntry } from "./prompt-evolution";

export interface RelevantMemoryInput {
  memoryDir: string;
  assetType: ArtLabAssetType;
  characterId?: string;
  topN?: number;
}

export interface RelevantMemoryResult {
  wins: StyleWinEntry[];
  rejections: RejectionEntry[];
  recentPromptHardening: PromptEvolutionEntry[];
}

export async function getRelevantMemory(input: RelevantMemoryInput): Promise<RelevantMemoryResult> {
  const topN = input.topN ?? 10;
  const winsAll = readStyleWins(input.memoryDir, input.characterId ? { characterId: input.characterId } : undefined);
  const rejAll = readRejections(input.memoryDir, input.characterId ? { characterId: input.characterId } : undefined);
  const evoAll = readPromptEvolution(input.memoryDir);
  return {
    wins: [...winsAll].sort((a, b) => b.promotedAt.localeCompare(a.promotedAt)).slice(0, topN),
    rejections: [...rejAll].sort((a, b) => b.rejectedAt.localeCompare(a.rejectedAt)).slice(0, topN),
    recentPromptHardening: [...evoAll].sort((a, b) => b.changedAt.localeCompare(a.changedAt)).slice(0, topN),
  };
}
