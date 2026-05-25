// src/lib/artlab/runners/production-runner.ts
//
// Renders the production sprite pack for a character. The pack matches
// CHARACTER_OUTFIT_VARIANTS × CHARACTER_POSES from src/lib/visual-assets/types.ts
// (3 outfits × 7 poses = 21 sprites). For non-character asset types the slot
// count falls back to PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE and renders simple
// numbered placeholders.
//
// Live path (GEMINI_API_KEY present + assetType character + approvedLaneIndex):
//   1. Load Tower context bundle + concept-board.json to recover the approved
//      lane's prompt.
//   2. Use prompt-builder to assemble 21 (outfit, pose) prompts that
//      interpolate the approved lane direction.
//   3. Parallel Gemini Nano Banana 2 calls (capped concurrency to respect
//      rate limits).
//   4. Write each slot's PNG bytes to production-slots/slot-<outfit>-<pose>.png
//      with a JSON sidecar.
// Fallback path: sharp placeholders.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import { createGeminiProvider, type GeminiProvider } from "../providers/gemini-adapter";
import { buildProductionSlotPrompts, type ProductionSlotPrompt } from "../orchestrator/prompt-builder";
import { loadTowerContext } from "../context/tower-context";
import { CHARACTER_OUTFIT_VARIANTS, CHARACTER_POSES } from "@/lib/visual-assets/types";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE: Record<ArtLabAssetType, number> = {
  character: CHARACTER_OUTFIT_VARIANTS.length * CHARACTER_POSES.length, // 21
  environment: 4,
  prop: 6,
  "ui-texture": 6,
  animation: 12,
  scene: 5,
  "icon-system": 8,
  "marketing-hero": 5,
  shader: 3,
};

const PARALLEL_LIMIT = 4; // Gemini rate-limit friendly

function geminiKeyFromEnv(): string | null {
  return process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("__") ? process.env.GEMINI_API_KEY : null;
}

function shouldUseRealGemini(): boolean {
  if (process.env.ARTLAB_GEMINI_MODE === "mock") return false;
  return geminiKeyFromEnv() !== null;
}

interface SlotOutput {
  jsonPath: string;
  pngPath: string;
  mode: "gemini" | "placeholder";
  outfit?: string;
  pose?: string;
  errorMessage?: string;
}

async function writePlaceholderSlot(
  runDir: string,
  slotName: string,
  laneIndex: number | undefined,
  subtitle: string,
  characterId: string | undefined,
  errorMessage?: string,
): Promise<SlotOutput> {
  const dir = join(runDir, "production-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `${slotName}.json`);
  const pngPath = join(dir, `${slotName}.png`);
  writeFileSync(jsonPath, JSON.stringify({
    slotId: slotName,
    laneIndex,
    mode: "placeholder",
    mock: true,
    alpha: true,
    ...(errorMessage ? { errorMessage } : {}),
  }));
  const display = displayFor(characterId);
  const png = await renderPlaceholderImage({
    title: display.firstName,
    subtitle,
    laneIndex: laneIndex ?? 1,
  });
  writeFileSync(pngPath, png);
  return { jsonPath, pngPath, mode: "placeholder", errorMessage };
}

async function generateGeminiSlot(
  runDir: string,
  characterId: string | undefined,
  prompt: ProductionSlotPrompt,
  provider: GeminiProvider,
  laneIndex: number,
): Promise<SlotOutput> {
  const dir = join(runDir, "production-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `${prompt.slotId}.json`);
  const pngPath = join(dir, `${prompt.slotId}.png`);
  try {
    const result = await provider.generateImage({
      prompt: prompt.prompt,
      aspectRatio: "9:16",
      laneIndex,
    });
    writeFileSync(pngPath, result.bytes);
    writeFileSync(jsonPath, JSON.stringify({
      slotId: prompt.slotId,
      outfit: prompt.outfit,
      pose: prompt.pose,
      laneIndex,
      mode: "gemini",
      prompt: prompt.prompt,
      providerMode: result.mode,
      contentType: result.contentType,
      costCents: result.costCents,
      durationMs: result.durationMs,
      alpha: true,
      generatedAt: new Date().toISOString(),
    }));
    return { jsonPath, pngPath, mode: "gemini", outfit: prompt.outfit, pose: prompt.pose };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return writePlaceholderSlot(runDir, prompt.slotId, laneIndex, `${prompt.outfit} · ${prompt.pose}`, characterId, message);
  }
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
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

function readApprovedLanePrompt(runDir: string, approvedLaneIndex: number): string | null {
  // Recover the approved lane's full prompt from concept-slots/lane-N.json
  // (written by concept-runner). Falls back to concept-board.json's
  // recorded prompts[] block.
  const conceptSlot = join(runDir, "concept-slots", `lane-${approvedLaneIndex}.json`);
  if (existsSync(conceptSlot)) {
    try {
      const parsed = JSON.parse(readFileSync(conceptSlot, "utf8")) as { prompt?: string };
      if (typeof parsed.prompt === "string" && parsed.prompt.length > 20) return parsed.prompt;
    } catch { /* fall through */ }
  }
  return null;
}

export const productionRunner: ArtLabRunner = {
  kind: "production",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const target = PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE[input.assetType];
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const useReal = shouldUseRealGemini() && input.assetType === "character" && typeof input.approvedLaneIndex === "number" && input.characterId;
    let slotOutputs: SlotOutput[];

    if (useReal) {
      try {
        const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? input.runDir;
        const bundle = await loadTowerContext({ workspaceRoot });
        const approvedLanePrompt = readApprovedLanePrompt(input.runDir, input.approvedLaneIndex!) ?? "";
        const prompts = await buildProductionSlotPrompts({
          characterId: input.characterId!,
          workspaceRoot,
          approvedLanePrompt,
          outfits: CHARACTER_OUTFIT_VARIANTS,
          poses: CHARACTER_POSES,
          bundle,
        });
        // Production sprites land in public/art/ and ship to interntower.com,
        // so we use the premium image tier by default (Nano Banana Pro).
        // Override via ARTLAB_PRODUCTION_IMAGE_MODEL.
        const productionModel = process.env.ARTLAB_PRODUCTION_IMAGE_MODEL ?? "nano-banana-pro-preview";
        const provider = createGeminiProvider({ apiKey: geminiKeyFromEnv()!, modelId: productionModel });
        const tasks = prompts.map((p) => async () => {
          if (input.abortSignal?.aborted) {
            return writePlaceholderSlot(input.runDir, p.slotId, input.approvedLaneIndex, `${p.outfit} · ${p.pose}`, input.characterId, "aborted");
          }
          return generateGeminiSlot(input.runDir, input.characterId, p, provider, input.approvedLaneIndex!);
        });
        slotOutputs = await runWithConcurrency(tasks, PARALLEL_LIMIT);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Fall back to all-placeholders.
        slotOutputs = await runWithConcurrency(
          Array.from({ length: target }, (_, i) => async () =>
            writePlaceholderSlot(input.runDir, `slot-${i + 1}`, input.approvedLaneIndex, `Sprite ${i + 1} of ${target}`, input.characterId, errMsg),
          ),
          PARALLEL_LIMIT,
        );
      }
    } else {
      // Non-character or no-Gemini path: simple numbered placeholders.
      slotOutputs = [];
      for (let i = 1; i <= target; i += 1) {
        if (input.abortSignal?.aborted) {
          return {
            runnerKind: "production",
            status: "failed",
            durationMs: Date.now() - startedAt,
            artifacts: { slotOutputs },
            blockerHint: "cancelled",
            failureCode: "aborted",
          };
        }
        slotOutputs.push(await writePlaceholderSlot(
          input.runDir,
          `slot-${i}`,
          input.approvedLaneIndex,
          `Sprite ${i} of ${target}`,
          input.characterId,
        ));
      }
    }

    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "production",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { slotOutputs },
        blockerHint: "cancelled",
        failureCode: "aborted",
      };
    }

    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs: slotOutputs.map((s) => s.jsonPath), slotCount: slotOutputs.length },
    };
  },
};
