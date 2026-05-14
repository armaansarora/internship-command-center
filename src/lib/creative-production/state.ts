import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CreativeAssetType } from "./types";

export interface CreativeStudioRecommendation {
  assetType: CreativeAssetType;
  name: string;
  reason: string;
}

export interface CreativeStudioState {
  schemaVersion: "tower-creative-studio-state-v1";
  engineVersion: "creative-production-engine-v1";
  updatedAt: string;
  done: string[];
  active: string[];
  remaining: string[];
  knownWarnings: string[];
  recommendedNext: CreativeStudioRecommendation;
}

export interface CreativeLiveArtStatusInput {
  approvedProductionSprites: number;
  expectedProductionSprites: number;
  fullyPromotedCharacters: string[];
  nextRecommendedCharacter: {
    characterId: string;
    displayName: string;
    reason: string;
  };
  runLedgers: Array<{
    characterId: string;
    runId: string;
    warningCounts: Record<string, number>;
  }>;
}

export interface CreativeStudioStateLoadResult {
  state: CreativeStudioState;
  source: "loaded" | "created-default" | "recovered-corrupt";
  backupPath?: string;
}

function isCreativeStudioState(value: unknown): value is CreativeStudioState {
  if (!value || typeof value !== "object") return false;

  const state = value as Partial<CreativeStudioState>;

  return (
    state.schemaVersion === "tower-creative-studio-state-v1" &&
    state.engineVersion === "creative-production-engine-v1" &&
    typeof state.updatedAt === "string" &&
    Array.isArray(state.done) &&
    Array.isArray(state.active) &&
    Array.isArray(state.remaining) &&
    Array.isArray(state.knownWarnings) &&
    !!state.recommendedNext &&
    typeof state.recommendedNext.name === "string"
  );
}

function formatWarningCounts(status?: CreativeLiveArtStatusInput): string[] {
  if (!status) return ["source-long-edge-below-4096 x21", "source-upscaled-to-master x21"];

  return status.runLedgers.flatMap((run) =>
    Object.entries(run.warningCounts).map(([warning, count]) => `${warning} x${count}`),
  );
}

export function createDefaultCreativeStudioState(
  now = new Date().toISOString(),
  liveStatus?: CreativeLiveArtStatusInput,
): CreativeStudioState {
  const approvedSummary = liveStatus
    ? `${liveStatus.approvedProductionSprites}/${liveStatus.expectedProductionSprites} approved production sprites`
    : "21/252 approved production sprites";
  const promotedCharacters = liveStatus?.fullyPromotedCharacters ?? ["Otis Vale (otis)"];
  const nextName = liveStatus?.nextRecommendedCharacter.displayName ?? "Otis Vale";
  const nextReason =
    liveStatus?.nextRecommendedCharacter.reason ??
    "Otis native-quality v2 must replace the prototype-upscaled pilot before new character work starts.";

  return {
    schemaVersion: "tower-creative-studio-state-v1",
    engineVersion: "creative-production-engine-v1",
    updatedAt: now,
    done: [
      "Four Lobby backgrounds preserved",
      "Otis Vale character pilot promoted",
      "Character rendering foundation added",
      "Batch character asset pipeline added",
      approvedSummary,
      `Promoted characters: ${promotedCharacters.join(", ")}`,
    ],
    active: [
      `${nextName} recommended next by live art status`,
      `${nextName} production packet is the next strict engine action`,
    ],
    remaining: [
      "11 Season 1 character identities",
      "Season 1 outfit, pose, and expression packs",
      "Floor environments beyond Lobby",
      "Props for character and floor storytelling",
      "UI textures and approved raster materials",
      "animations and ambient motion loops",
      "Scene art for onboarding and floor moments",
      "Marketing hero imagery when product pages need it",
    ],
    knownWarnings: formatWarningCounts(liveStatus),
    recommendedNext: {
      assetType: "character",
      name: nextName,
      reason: nextReason,
    },
  };
}

export async function loadCreativeStudioState(
  path = ".artlab/studio/state.json",
): Promise<CreativeStudioState> {
  return (await loadCreativeStudioStateWithRecovery(path)).state;
}

export async function loadCreativeStudioStateWithRecovery(
  path = ".artlab/studio/state.json",
): Promise<CreativeStudioStateLoadResult> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;

    if (!isCreativeStudioState(parsed)) {
      throw new Error("Creative studio state schema is invalid.");
    }

    return {
      state: parsed,
      source: "loaded",
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        state: createDefaultCreativeStudioState(),
        source: "created-default",
      };
    }

    const backupPath = `${path}.corrupt-${Date.now()}`;

    await copyFile(path, backupPath).catch(() => undefined);

    return {
      state: createDefaultCreativeStudioState(),
      source: "recovered-corrupt",
      backupPath,
    };
  }
}

export async function saveCreativeStudioState(
  path: string,
  state: CreativeStudioState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;

  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temporaryPath, path);
}
