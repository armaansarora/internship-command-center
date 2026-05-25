// src/lib/artlab/runners/concept-runner.ts
//
// Produces 5 concept-board lanes. The path forks on whether GEMINI_API_KEY is
// present in the environment:
//   • Live path  — Claude brain authors 5 distinct prompts via
//     `generate-concept-prompts`, then Gemini Nano Banana 2 renders each lane.
//     The PNG bytes returned by Gemini land at concept-slots/lane-N.png.
//     A lane-N.json sidecar records the prompt + provider metadata.
//   • Mock path  — sharp placeholder PNGs (existing renderer). Used by tests
//     (ARTLAB_GEMINI_MODE=mock) and when the API key is missing.
//
// Lane failures are isolated: a single Gemini error falls back to a
// placeholder for that lane and records a per-lane provider-blocked
// note in the slot's JSON. The runner only returns `failed` when ALL 5 lanes
// fall through to placeholders AND ARTLAB_GEMINI_MODE !== "mock" — i.e. real
// generation was attempted and all lanes errored.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import { createGeminiProvider, type GeminiProvider } from "../providers/gemini-adapter";
import { createClaudeBrain } from "../orchestrator/claude-brain";
import { createGeminiBrain } from "../orchestrator/gemini-brain";
import { createLoggedBrain } from "../orchestrator/logged-brain";
import { decideWithMockBrain, type ArtLabLlmBrain } from "../orchestrator/llm-brain";
import { buildConceptLanePrompts, type ConceptLanePrompt } from "../orchestrator/prompt-builder";
import { loadTowerContext, pickCharacterContext } from "../context/tower-context";
import { recommendDirection } from "../orchestrator/recommend-direction";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const TARGET_LANES = 5;

interface ConceptSlotOutputs {
  jsonPath: string;
  pngPath: string;
  mode: "gemini" | "placeholder";
  errorMessage?: string;
}

function geminiKeyFromEnv(): string | null {
  return process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("__") ? process.env.GEMINI_API_KEY : null;
}

function shouldUseRealGemini(): boolean {
  if (process.env.ARTLAB_GEMINI_MODE === "mock") return false;
  return geminiKeyFromEnv() !== null;
}

function buildBrain(workspaceRoot: string): ArtLabLlmBrain {
  // Brain preference: Anthropic (if key present) > Gemini (reuses image key) > mock.
  // The Gemini-brain path is the user's default when only GEMINI_API_KEY is wired —
  // same key powers both image generation and prompt-variation authoring.
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const claudeModel = process.env.ARTLAB_CLAUDE_MODEL ?? "claude-opus-4-5";
  const geminiKey = geminiKeyFromEnv();
  const geminiBrainModel = process.env.ARTLAB_GEMINI_BRAIN_MODEL; // optional override
  let raw: ArtLabLlmBrain;
  if (anthropicKey && process.env.ARTLAB_BRAIN_PROVIDER !== "gemini") {
    raw = createClaudeBrain({ apiKey: anthropicKey, model: claudeModel });
  } else if (geminiKey) {
    raw = createGeminiBrain({ apiKey: geminiKey, model: geminiBrainModel });
  } else {
    raw = { decide: decideWithMockBrain };
  }
  return createLoggedBrain({ inner: raw, workspaceRoot });
}

async function renderPlaceholderLane(
  runDir: string,
  characterId: string | undefined,
  laneIndex: number,
  errorMessage?: string,
): Promise<ConceptSlotOutputs> {
  const dir = join(runDir, "concept-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `lane-${laneIndex}.json`);
  const pngPath = join(dir, `lane-${laneIndex}.png`);
  const display = displayFor(characterId);
  const png = await renderPlaceholderImage({
    title: display.firstName,
    subtitle: `Direction ${laneIndex} · concept lane`,
    laneIndex,
  });
  writeFileSync(pngPath, png);
  writeFileSync(jsonPath, JSON.stringify({
    laneIndex,
    mode: "placeholder",
    mock: true,
    alpha: true,
    generatedAt: new Date().toISOString(),
    ...(errorMessage ? { errorMessage } : {}),
  }));
  return { jsonPath, pngPath, mode: "placeholder", errorMessage };
}

async function generateGeminiLane(
  runDir: string,
  characterId: string | undefined,
  laneIndex: number,
  prompt: ConceptLanePrompt,
  provider: GeminiProvider,
): Promise<ConceptSlotOutputs> {
  const dir = join(runDir, "concept-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `lane-${laneIndex}.json`);
  const pngPath = join(dir, `lane-${laneIndex}.png`);
  try {
    const result = await provider.generateImage({
      prompt: prompt.prompt,
      aspectRatio: "9:16",
      laneIndex,
    });
    writeFileSync(pngPath, result.bytes);
    writeFileSync(jsonPath, JSON.stringify({
      laneIndex,
      mode: "gemini",
      variationAxis: prompt.variationAxis,
      prompt: prompt.prompt,
      providerMode: result.mode,
      contentType: result.contentType,
      costCents: result.costCents,
      durationMs: result.durationMs,
      alpha: true,
      generatedAt: new Date().toISOString(),
    }));
    return { jsonPath, pngPath, mode: "gemini" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderPlaceholderLane(runDir, characterId, laneIndex, message);
  }
}

export const conceptRunner: ArtLabRunner = {
  kind: "concept",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: {}, blockerHint: "cancelled", failureCode: "aborted",
      };
    }

    const laneIndexes = Array.from({ length: TARGET_LANES }, (_, i) => i + 1);
    const useReal = shouldUseRealGemini();
    let slotOutputs: ConceptSlotOutputs[];
    let promptsUsed: ConceptLanePrompt[] = [];
    let promptSource: "brain" | "canonical-fallback" | "skipped" = "skipped";

    let towerCtx: ReturnType<typeof pickCharacterContext> = null;
    let towerBundle: Awaited<ReturnType<typeof loadTowerContext>> | null = null;
    let recommendBrain: ReturnType<typeof buildBrain> | null = null;

    if (useReal && input.characterId) {
      try {
        const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? input.runDir;
        const brain = buildBrain(workspaceRoot);
        recommendBrain = brain;
        const bundle = await loadTowerContext({ workspaceRoot });
        towerBundle = bundle;
        towerCtx = pickCharacterContext(bundle, input.characterId);
        const built = await buildConceptLanePrompts({
          characterId: input.characterId,
          workspaceRoot,
          brain,
          bundle,
        });
        promptsUsed = built.prompts;
        promptSource = built.source;
        const provider = createGeminiProvider({ apiKey: geminiKeyFromEnv()! });
        slotOutputs = await Promise.all(
          laneIndexes.map((idx) => {
            const lanePrompt = built.prompts.find((p) => p.laneIndex === idx) ?? built.prompts[idx - 1]!;
            return generateGeminiLane(input.runDir, input.characterId, idx, lanePrompt, provider);
          }),
        );
      } catch (err) {
        // Fatal prompt-builder failure — fall back to all-placeholder.
        const errMsg = err instanceof Error ? err.message : String(err);
        slotOutputs = await Promise.all(
          laneIndexes.map((idx) => renderPlaceholderLane(input.runDir, input.characterId, idx, `prompt-build: ${errMsg}`)),
        );
      }
    } else {
      // Mock / no-key path.
      slotOutputs = await Promise.all(
        laneIndexes.map((idx) => renderPlaceholderLane(input.runDir, input.characterId, idx)),
      );
    }

    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: { slotOutputs }, blockerHint: "cancelled", failureCode: "aborted",
      };
    }

    const conceptBoardPath = join(input.runDir, "concept-board.json");
    writeFileSync(
      conceptBoardPath,
      JSON.stringify({
        runId: input.runId,
        characterId: input.characterId,
        promptSource,
        lanes: slotOutputs.map(({ jsonPath, pngPath, mode, errorMessage }, idx) => ({
          laneIndex: idx + 1,
          jsonPath,
          pngPath,
          mode,
          ...(errorMessage ? { errorMessage } : {}),
        })),
        prompts: promptsUsed.map((p) => ({ laneIndex: p.laneIndex, variationAxis: p.variationAxis })),
        createdAt: new Date().toISOString(),
      }, null, 2),
    );

    // If we tried real Gemini but every single lane fell back to placeholder,
    // that's a hard provider failure worth signalling so the daemon can
    // surface it to the user.
    const allFailedReal = useReal && slotOutputs.every((s) => s.mode === "placeholder");
    if (allFailedReal) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: { slotOutputs, conceptBoardPath, promptSource },
        blockerHint: "provider-blocked",
        failureCode: "gemini-all-lanes-failed",
      };
    }

    // Write a recommendation if we have brain + tower-context. Failures here
    // are non-fatal — the concept board still surfaces without a "Recommended"
    // line.
    if (recommendBrain && towerCtx && towerBundle && promptsUsed.length > 0) {
      try {
        const recommendation = await recommendDirection({
          characterId: input.characterId!,
          characterContext: towerCtx,
          lanes: promptsUsed.map((p, i) => ({
            laneIndex: p.laneIndex,
            variationAxis: p.variationAxis,
            prompt: p.prompt,
            pngPath: slotOutputs[i]!.pngPath,
          })),
          brain: recommendBrain,
        });
        writeFileSync(join(input.runDir, "recommendation.json"), JSON.stringify(recommendation, null, 2));
      } catch {
        // swallow — recommendation is optional
      }
    }

    return {
      runnerKind: "concept", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, conceptBoardPath, promptSource },
    };
  },
};
