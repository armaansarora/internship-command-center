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
import { loadTowerContext, pickCharacterContext } from "../context/tower-context";
import { createClaudeBrain } from "../orchestrator/claude-brain";
import { createGeminiBrain } from "../orchestrator/gemini-brain";
import { createLoggedBrain } from "../orchestrator/logged-brain";
import { decideWithMockBrain, type ArtLabLlmBrain } from "../orchestrator/llm-brain";
import { CHARACTER_OUTFIT_VARIANTS, CHARACTER_POSES } from "@/lib/visual-assets/types";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

function buildBrain(workspaceRoot: string): ArtLabLlmBrain {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const claudeModel = process.env.ARTLAB_CLAUDE_MODEL ?? "claude-opus-4-5";
  const geminiKey = geminiKeyFromEnv();
  const geminiBrainModel = process.env.ARTLAB_GEMINI_BRAIN_MODEL;
  const forceGemini = process.env.ARTLAB_BRAIN_PROVIDER === "gemini";
  let raw: ArtLabLlmBrain;
  if (anthropicKey && !forceGemini) {
    const claude = createClaudeBrain({ apiKey: anthropicKey, model: claudeModel });
    const fallback = geminiKey
      ? createGeminiBrain({ apiKey: geminiKey, model: geminiBrainModel })
      : null;
    raw = {
      async decide(req) {
        try { return await claude.decide(req); }
        catch (err) {
          if (!fallback) throw err;
          return fallback.decide(req);
        }
      },
    };
  } else if (geminiKey) {
    raw = createGeminiBrain({ apiKey: geminiKey, model: geminiBrainModel });
  } else {
    raw = { decide: decideWithMockBrain };
  }
  return createLoggedBrain({ inner: raw, workspaceRoot });
}

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
  referenceImageBytes: Buffer | undefined,
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
      referenceImageBytes,
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
        const prompts = await buildProductionSlotPrompts({
          characterId: input.characterId!,
          workspaceRoot,
          approvedLaneIndex: input.approvedLaneIndex!,
          outfits: CHARACTER_OUTFIT_VARIANTS,
          poses: CHARACTER_POSES,
          bundle,
        });
        // Production sprites land in public/art/ and ship to interntower.com,
        // so we use the premium image tier by default (Nano Banana Pro).
        // Override via ARTLAB_PRODUCTION_IMAGE_MODEL.
        const productionModel = process.env.ARTLAB_PRODUCTION_IMAGE_MODEL ?? "nano-banana-pro-preview";
        const provider = createGeminiProvider({ apiKey: geminiKeyFromEnv()!, modelId: productionModel });
        // Anchor every production sprite to the approved lane's PNG so the
        // 21 sprites all share the same face / identity instead of drifting
        // into 21 different people.
        const referenceLanePath = join(input.runDir, "concept-slots", `lane-${input.approvedLaneIndex!}.png`);
        const referenceImageBytes = existsSync(referenceLanePath) ? readFileSync(referenceLanePath) : undefined;
        const tasks = prompts.map((p) => async () => {
          if (input.abortSignal?.aborted) {
            return writePlaceholderSlot(input.runDir, p.slotId, input.approvedLaneIndex, `${p.outfit} · ${p.pose}`, input.characterId, "aborted");
          }
          return generateGeminiSlot(input.runDir, input.characterId, p, provider, input.approvedLaneIndex!, referenceImageBytes);
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

    // Placeholder gate — if Gemini failed on enough slots that the run would
    // ship placeholders into public/art/, halt with provider-blocked instead
    // of continuing through cutout + strict-qa + promotion.
    if (useReal && input.characterId) {
      const placeholderCount = slotOutputs.filter((s) => s.mode === "placeholder").length;
      const placeholderThreshold = Math.max(2, Math.floor(slotOutputs.length * 0.1));
      if (placeholderCount > placeholderThreshold) {
        return {
          runnerKind: "production",
          status: "failed",
          durationMs: Date.now() - startedAt,
          artifacts: {
            slotOutputs: slotOutputs.map((s) => s.jsonPath),
            placeholderCount,
            placeholderThreshold,
          },
          blockerHint: "provider-blocked",
          failureCode: `placeholder-gate:${placeholderCount}-of-${slotOutputs.length}`,
        };
      }
    }

    // Multimodal QA — brain SEES all the production sprites and flags drift.
    // Optional + best-effort; failures are non-fatal.
    if (useReal && input.characterId && slotOutputs.length > 0) {
      try {
        const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? input.runDir;
        const bundle = await loadTowerContext({ workspaceRoot });
        const ctx = pickCharacterContext(bundle, input.characterId);
        const brain = buildBrain(workspaceRoot);
        const realOutputs = slotOutputs.filter((s) => s.mode === "gemini");
        if (ctx && realOutputs.length >= Math.min(slotOutputs.length, 12)) {
          const sampleSize = Math.min(realOutputs.length, 12); // cap to keep request small
          const sampled = realOutputs.slice(0, sampleSize);
          const critiqueResult = await brain.decide({
            kind: "critique-production-sprites",
            input: {
              characterContext: {
                characterId: ctx.characterId,
                displayName: ctx.displayName,
                title: ctx.title,
                space: ctx.space,
                visualArchetype: ctx.visualArchetype,
                silhouette: ctx.silhouette,
                wardrobe: ctx.wardrobe,
                accent: ctx.accent,
              },
              slotMetadata: sampled.map((s) => ({ slotId: `${s.outfit}-${s.pose}`, outfit: s.outfit, pose: s.pose })),
              totalSpriteCount: slotOutputs.length,
            },
            images: sampled.map((s) => ({ path: s.pngPath })),
          });
          if (critiqueResult.outputJson && typeof critiqueResult.outputJson === "object") {
            writeFileSync(join(input.runDir, "production-critique.json"), JSON.stringify(critiqueResult.outputJson, null, 2));
          }
        }
      } catch {
        // non-fatal
      }
    }

    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs: slotOutputs.map((s) => s.jsonPath), slotCount: slotOutputs.length },
    };
  },
};
