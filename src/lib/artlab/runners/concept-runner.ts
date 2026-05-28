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
import { DEFAULT_ARTLAB_CLAUDE_MODEL } from "../sdk/brain/provider-registry";
import { buildConceptLanePrompts, type ConceptLanePrompt } from "../orchestrator/prompt-builder";
import { loadTowerContext, pickCharacterContext } from "../context/tower-context";
import { recommendDirection } from "../orchestrator/recommend-direction";
import { readConceptFeedback } from "../brainstorm/feedback-ledger";
import { summariseFeedbackForBrain } from "../memory/feedback-summary";
import { recordConceptCritiqueFallback, type ConceptCritiqueFallbackOutcome } from "./concept-critique-blocker";
import { loadArtLabCanon } from "../sdk/canon/load-canon";
import { resolveCanonCharacter } from "../sdk/canon/resolve-character";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const TARGET_LANES = 5;

async function runConceptConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
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

interface RefineFromFeedbackInput {
  workspaceRoot: string;
  brain: ArtLabLlmBrain;
  bundle: Awaited<ReturnType<typeof loadTowerContext>>;
  characterId: string;
  feedback: ReturnType<typeof readConceptFeedback>;
}

async function refineConceptPromptsFromFeedback(input: RefineFromFeedbackInput): Promise<{ prompts: ConceptLanePrompt[]; source: "brain" | "canonical" } | null> {
  const ctx = pickCharacterContext(input.bundle, input.characterId);
  if (!ctx) return null;
  try {
    const result = await input.brain.decide({
      kind: "refine-concept-prompts",
      input: {
        characterContext: {
          characterId: ctx.characterId,
          displayName: ctx.displayName,
          title: ctx.title,
          space: ctx.space,
          visualArchetype: ctx.visualArchetype,
          silhouette: ctx.silhouette,
          wardrobe: ctx.wardrobe,
          props: ctx.props,
          mobileRead: ctx.mobileRead,
          accent: ctx.accent,
          negativeDNA: ctx.negativeDNA,
        },
        feedback: input.feedback,
        recentMemory: summariseFeedbackForBrain(ctx.recentStyleWins, ctx.recentRejections),
      },
    });
    const arr = (result.outputJson as { prompts?: unknown }).prompts;
    if (!Array.isArray(arr)) return null;
    const prompts: ConceptLanePrompt[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const i = item as { laneIndex?: unknown; prompt?: unknown; variationAxis?: unknown };
      if (typeof i.laneIndex !== "number" || typeof i.prompt !== "string") continue;
      prompts.push({
        laneIndex: i.laneIndex,
        prompt: i.prompt,
        variationAxis: typeof i.variationAxis === "string" ? i.variationAxis : "refined",
      });
    }
    prompts.sort((a, b) => a.laneIndex - b.laneIndex);
    if (prompts.length === 5) return { prompts, source: "brain" };
  } catch {
    // fall through
  }
  return null;
}

function buildBrain(workspaceRoot: string): ArtLabLlmBrain {
  // Brain preference: Anthropic (if key present) > Gemini (reuses image key) > mock.
  // If Anthropic is configured but throws at runtime (invalid key / 401 / 5xx)
  // we transparently retry the same decision against the Gemini brain — that
  // way a stale ANTHROPIC_API_KEY doesn't cascade into the canonical path
  // when the user has a perfectly good Gemini key available.
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const claudeModel = process.env.ARTLAB_CLAUDE_MODEL ?? DEFAULT_ARTLAB_CLAUDE_MODEL;
  const geminiKey = geminiKeyFromEnv();
  const geminiBrainModel = process.env.ARTLAB_GEMINI_BRAIN_MODEL; // optional override
  const forceGemini = process.env.ARTLAB_BRAIN_PROVIDER === "gemini";
  let raw: ArtLabLlmBrain;
  if (anthropicKey && !forceGemini) {
    const claude = createClaudeBrain({ apiKey: anthropicKey, model: claudeModel });
    const fallback = geminiKey
      ? createGeminiBrain({ apiKey: geminiKey, model: geminiBrainModel })
      : null;
    raw = {
      async decide(req) {
        try {
          return await claude.decide(req);
        } catch (err) {
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
    // Single source of truth for the workspace root — used by brain
    // construction below and by `recordConceptCritiqueFallback` further
    // down for daemon-error telemetry. Mirrors what the rest of the
    // runner already does (process.env.ARTLAB_WORKSPACE_ROOT ?? input.runDir).
    const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? input.runDir;

    // Resolve the canon header.id for this character. Runtime callers pass in
    // a runtime slug (e.g. "cro") but canon records are keyed by header.id
    // (e.g. "rafe-calder"). The concept-board.json artifact must record the
    // canonical id so it's greppable against canon. Resolver does header.id
    // first, then roleSlug fallback. If canon can't be loaded (missing dir,
    // unset env, etc.) we proceed with the runtime slug — the runner stays
    // robust to canon errors.
    const projectRoot = process.env.ARTLAB_PROJECT_ROOT ?? process.cwd();
    const canonRoot = process.env.ARTLAB_CANON_ROOT ?? join(projectRoot, "docs/artlab/sdk/canon");
    let resolvedCharacterId = input.characterId;
    if (input.characterId) {
      try {
        const canon = await loadArtLabCanon({ canonRoot });
        const canonChar = resolveCanonCharacter(canon.characters, input.characterId);
        if (canonChar) resolvedCharacterId = canonChar.header.id;
      } catch (err) {
        console.info(JSON.stringify({
          level: "info",
          event: "canon-load-skipped",
          err: (err as Error).message,
        }));
      }
    }
    let slotOutputs: ConceptSlotOutputs[];
    let promptsUsed: ConceptLanePrompt[] = [];
    let promptSource: "brain" | "canonical" | "skipped" = "skipped";

    let towerCtx: ReturnType<typeof pickCharacterContext> = null;
    let towerBundle: Awaited<ReturnType<typeof loadTowerContext>> | null = null;
    let recommendBrain: ReturnType<typeof buildBrain> | null = null;
    // When the multimodal critique fails (brain throw or laneImages
    // mismatch), this carries the blocker descriptor through to the
    // runner result so the orchestrator persists it via the state
    // machine. See `recordConceptCritiqueFallback`.
    let critiqueFallback: ConceptCritiqueFallbackOutcome | null = null;

    if (useReal && input.characterId) {
      try {
        const brain = buildBrain(workspaceRoot);
        recommendBrain = brain;
        const bundle = await loadTowerContext({ workspaceRoot });
        towerBundle = bundle;
        towerCtx = pickCharacterContext(bundle, input.characterId);

        // Refinement path: if concept-feedback.jsonl has entries from a prior
        // round, ask the brain to rewrite the 5 prompts incorporating feedback.
        // Otherwise compose fresh prompts via buildConceptLanePrompts.
        const feedback = readConceptFeedback(input.runDir);
        let built: { prompts: ConceptLanePrompt[]; source: "brain" | "canonical" };
        if (feedback.length > 0) {
          built = await refineConceptPromptsFromFeedback({
            workspaceRoot,
            brain,
            bundle,
            characterId: input.characterId,
            feedback,
          }) ?? await buildConceptLanePrompts({
            characterId: input.characterId,
            workspaceRoot,
            brain,
            bundle,
          });
        } else {
          built = await buildConceptLanePrompts({
            characterId: input.characterId,
            workspaceRoot,
            brain,
            bundle,
          });
        }
        promptsUsed = built.prompts;
        promptSource = built.source;
        // Concept exploration uses the cheap fast tier by default — we
        // generate a lot of variations, the user picks one, and only the
        // winner advances to the premium production tier downstream.
        const conceptModel = process.env.ARTLAB_CONCEPT_IMAGE_MODEL ?? "gemini-2.5-flash-image";
        const provider = createGeminiProvider({ apiKey: geminiKeyFromEnv()!, modelId: conceptModel });
        // Concurrency=2 cuts 5-lane wall time roughly in half (~40s → ~20s).
        // The image-adapter retry layer (round 1) transparently absorbs the
        // occasional 503 the preview model throws under concurrent load.
        // Override with ARTLAB_CONCEPT_PARALLELISM for env tuning.
        const concurrency = Math.max(1, Number.parseInt(process.env.ARTLAB_CONCEPT_PARALLELISM ?? "2", 10));
        const conceptTasks = laneIndexes.map((idx) => async () => {
          const lanePrompt = built.prompts.find((p) => p.laneIndex === idx) ?? built.prompts[idx - 1]!;
          return generateGeminiLane(input.runDir, input.characterId, idx, lanePrompt, provider);
        });
        slotOutputs = await runConceptConcurrency(conceptTasks, concurrency);
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
        characterId: resolvedCharacterId,
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

      // Multimodal critique — brain SEES the 5 generated PNGs and writes a
      // grounded critique with per-lane notes + star ratings. This is the
      // brainstorm-mode killer feature: real visual critique, not just
      // "middle lane is the safe pick".
      //
      // Two fallback paths surface as `concept-critique-fallback`:
      //   • brain.decide throws (network / 401 / 5xx) → no quality gate.
      //   • laneImages count mismatch (not every lane has a real image) →
      //     critique block is skipped.
      // Both record a daemon-error line via `recordConceptCritiqueFallback`
      // AND cause the runner to return `status:"failed"` with
      // `blockerHint:"concept-critique-fallback"`. The orchestrator's
      // failed-branch persists the blocker into run-state through the
      // state-machine-blessed write — previously, this runner wrote
      // run-state out-of-band and the orchestrator's auto-transition
      // immediately overwrote `blocker: undefined`, silently losing the
      // signal (Unit 3, 2026-05-27).
      const laneImages = slotOutputs
        .filter((s) => s.mode === "gemini")  // only critique real images, not placeholders
        .map((s) => ({ path: s.pngPath }));
      if (laneImages.length === slotOutputs.length && laneImages.length === promptsUsed.length) {
        try {
          const critiqueResult = await recommendBrain.decide({
            kind: "critique-concept-board",
            input: {
              characterContext: {
                characterId: towerCtx.characterId,
                displayName: towerCtx.displayName,
                title: towerCtx.title,
                space: towerCtx.space,
                visualArchetype: towerCtx.visualArchetype,
                silhouette: towerCtx.silhouette,
                wardrobe: towerCtx.wardrobe,
                props: towerCtx.props,
                mobileRead: towerCtx.mobileRead,
                accent: towerCtx.accent,
                forbiddenVisualTraits: towerCtx.forbiddenVisualTraits,
              },
              laneMetadata: promptsUsed.map((p) => ({
                laneIndex: p.laneIndex,
                variationAxis: p.variationAxis,
                promptExcerpt: p.prompt.slice(0, 400),
              })),
              promotedCast: Object.values(towerBundle.characters)
                .filter((c) => c.characterId !== towerCtx.characterId)
                .map((c) => ({ characterId: c.characterId, displayName: c.displayName, accent: c.accent, silhouette: c.silhouette })),
            },
            images: laneImages,
          });
          // Persist the critique JSON for phase-notifier to render.
          if (critiqueResult.outputJson && typeof critiqueResult.outputJson === "object") {
            writeFileSync(join(input.runDir, "concept-critique.json"), JSON.stringify(critiqueResult.outputJson, null, 2));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          critiqueFallback = recordConceptCritiqueFallback(workspaceRoot, `brain failed: ${message}`);
        }
      } else {
        critiqueFallback = recordConceptCritiqueFallback(
          workspaceRoot,
          `laneImages mismatch (real=${laneImages.length} expected=${slotOutputs.length})`,
        );
      }
    }

    if (critiqueFallback) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: { slotOutputs, conceptBoardPath, promptSource },
        blockerHint: critiqueFallback.blocker,
        failureCode: critiqueFallback.failureCode,
      };
    }

    return {
      runnerKind: "concept", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, conceptBoardPath, promptSource },
    };
  },
};
