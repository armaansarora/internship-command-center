// src/lib/artlab/runners/brief-runner.ts
//
// Composes the design brief for a Tower character/floor BEFORE any image is
// generated. The brain reads the bible + cast continuity + memory ledgers
// and produces a structured proposal the user reviews via inline keyboard.
//
// First pass (iteration 0): calls brain `compose-brief` from scratch.
// Subsequent passes (iteration >= 1): if brief-adjustments.jsonl has new
// entries, calls `refine-brief` with the prior brief + accumulated user
// adjustments.
//
// If ARTLAB_BRAINSTORM_MODE=off, this runner writes a default brief and
// auto-approves it so the existing direct pipeline still works.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTowerContext, pickCharacterContext, type TowerCharacterContext } from "../context/tower-context";
import { createClaudeBrain } from "../orchestrator/claude-brain";
import { createGeminiBrain } from "../orchestrator/gemini-brain";
import { createLoggedBrain } from "../orchestrator/logged-brain";
import { decideWithMockBrain, type ArtLabLlmBrain } from "../orchestrator/llm-brain";
import {
  DesignBriefSchema,
  type DesignBrief,
  type BriefAdjustmentOption,
} from "../brainstorm/brief-schema";
import { readBriefAdjustments } from "../brainstorm/feedback-ledger";
import { summariseFeedbackForBrain } from "../memory/feedback-summary";
import { writeRunStateSnapshot, readRunStateSnapshot } from "../state/snapshots";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

function buildBrain(workspaceRoot: string): ArtLabLlmBrain {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const claudeModel = process.env.ARTLAB_CLAUDE_MODEL ?? "claude-opus-4-5";
  const geminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("__")
    ? process.env.GEMINI_API_KEY
    : null;
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

function readExistingBrief(runDir: string): DesignBrief | null {
  const path = join(runDir, "brief.json");
  if (!existsSync(path)) return null;
  try { return DesignBriefSchema.parse(JSON.parse(readFileSync(path, "utf8"))); }
  catch { return null; }
}

function writeBrief(runDir: string, brief: DesignBrief): void {
  writeFileSync(join(runDir, "brief.json"), JSON.stringify(brief, null, 2));
  appendFileSync(join(runDir, "brief-history.jsonl"), `${JSON.stringify(brief)}\n`);
}

function canonicalBriefFromContext(ctx: TowerCharacterContext, runId: string): Omit<DesignBrief, "iteration" | "composedAt"> {
  return {
    runId,
    characterId: ctx.characterId,
    identity: [
      `${ctx.displayName}, the ${ctx.title}.`,
      `${ctx.visualArchetype} `,
      `Silhouette: ${ctx.silhouette} Wardrobe: ${ctx.wardrobe} Signature props: ${ctx.props}.`,
    ].join(" "),
    plannedVariation: [
      "Younger interpretation, confident front-facing stance, palette accent leads.",
      "Mid-career three-quarter lean, signature prop held mid-extension.",
      "Engaged listening, head tilted, attentive expression.",
      "Senior with silver at temples, grounded working stance.",
      "Approachable greeting with open shoulders and small genuine smile.",
    ],
    referenceAnchor: `Painterly luxury editorial style — Square Enix / Riot Games character-art quality, like Otis and Mara. ${ctx.mobileRead} Solid neutral pastel-cream backdrop. ${ctx.artDirectionNotes ?? ""}`.trim(),
    adjustmentOptions: [
      { label: "🎨 Adjust palette", dimension: "palette" },
      { label: "👤 Adjust age range", dimension: "age" },
      { label: "🎭 Adjust energy", dimension: "energy" },
      { label: "🎯 Adjust prop emphasis", dimension: "props" },
      { label: "✏️ Free-text", dimension: "freetext" },
    ],
    source: "canonical-fallback",
  };
}

function parseBriefFromBrain(
  json: unknown,
  runId: string,
  characterId: string | undefined,
  existing?: DesignBrief,
): Partial<DesignBrief> | null {
  if (!json || typeof json !== "object") return null;
  const j = json as {
    identity?: unknown;
    plannedVariation?: unknown;
    referenceAnchor?: unknown;
    adjustmentOptions?: unknown;
    deltaSummary?: unknown;
  };
  // Delta-merge path: when refining and the brain omits unchanged fields,
  // carry forward from the existing brief instead of rejecting the response.
  const identity = typeof j.identity === "string" ? j.identity : existing?.identity;
  const referenceAnchor = typeof j.referenceAnchor === "string" ? j.referenceAnchor : existing?.referenceAnchor;
  const planned = Array.isArray(j.plannedVariation)
    ? j.plannedVariation.filter((v): v is string => typeof v === "string")
    : existing?.plannedVariation ?? [];
  if (!identity || !referenceAnchor || planned.length === 0) return null;
  const adjustments: BriefAdjustmentOption[] = [];
  if (Array.isArray(j.adjustmentOptions)) {
    for (const opt of j.adjustmentOptions) {
      if (!opt || typeof opt !== "object") continue;
      const o = opt as { label?: unknown; dimension?: unknown };
      if (typeof o.label === "string" && typeof o.dimension === "string") {
        const dim = o.dimension as BriefAdjustmentOption["dimension"];
        if (["palette", "age", "energy", "props", "references", "freetext"].includes(dim)) {
          adjustments.push({ label: o.label.slice(0, 48), dimension: dim });
        }
      }
    }
  } else if (existing) {
    adjustments.push(...existing.adjustmentOptions);
  }
  // Always ensure freetext is offered as a fallback.
  if (!adjustments.some((a) => a.dimension === "freetext")) {
    adjustments.push({ label: "✏️ Free-text feedback", dimension: "freetext" });
  }
  return {
    runId,
    characterId,
    identity,
    plannedVariation: planned.slice(0, 8),
    referenceAnchor,
    adjustmentOptions: adjustments.slice(0, 6),
    deltaSummary: typeof j.deltaSummary === "string" ? j.deltaSummary : undefined,
  };
}

async function composeOrRefineBrief(input: ArtLabRunnerInput): Promise<{ brief: DesignBrief; source: "brain" | "canonical-fallback" }> {
  const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? input.runDir;
  const bundle = await loadTowerContext({ workspaceRoot });
  const ctx = input.characterId ? pickCharacterContext(bundle, input.characterId) : null;
  if (!ctx) {
    // No character match. We REFUSE the silent lobby-fallback that the
    // previous implementation had — it confused users into thinking their
    // "make Sol Navarro" request had been routed to the lobby. Instead,
    // throw so the runner surfaces a needs-human blocker; the bot will
    // show a "couldn't route — please specify" message.
    throw new Error(
      `brief-runner: no character context for "${input.characterId ?? "<missing>"}" — request needs clarification`,
    );
  }

  const existing = readExistingBrief(input.runDir);
  const adjustments = readBriefAdjustments(input.runDir);
  const iteration = existing ? existing.iteration + 1 : 0;

  // Brainstorm-mode off → write a single canonical brief and auto-approve.
  if (process.env.ARTLAB_BRAINSTORM_MODE === "off") {
    const base = canonicalBriefFromContext(ctx, input.runId);
    const brief: DesignBrief = DesignBriefSchema.parse({
      ...base,
      composedAt: new Date().toISOString(),
      iteration: 0,
    });
    return { brief, source: "canonical-fallback" };
  }

  const brain = buildBrain(workspaceRoot);
  const brainInput = existing && adjustments.length > 0
    ? {
        kind: "refine-brief" as const,
        input: {
          currentBrief: existing,
          adjustments,
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
            negativeDNA: ctx.negativeDNA,
            accent: ctx.accent,
            wound: ctx.wound,
            doctrine: ctx.doctrine,
            flaw: ctx.flaw,
            visualDNA: ctx.visualDNA,
            forbiddenVisualTraits: ctx.forbiddenVisualTraits,
            artDirectionNotes: ctx.artDirectionNotes,
          },
          recentMemory: summariseFeedbackForBrain(ctx.recentStyleWins, ctx.recentRejections),
        },
      }
    : {
        kind: "compose-brief" as const,
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
            negativeDNA: ctx.negativeDNA,
            accent: ctx.accent,
            wound: ctx.wound,
            doctrine: ctx.doctrine,
            flaw: ctx.flaw,
            visualDNA: ctx.visualDNA,
            forbiddenVisualTraits: ctx.forbiddenVisualTraits,
            artDirectionNotes: ctx.artDirectionNotes,
          },
          styleEnvelope: { id: bundle.styleEnvelope.id, storyTone: bundle.styleEnvelope.storyTone },
          recentMemory: summariseFeedbackForBrain(ctx.recentStyleWins, ctx.recentRejections),
          castContinuity: Object.values(bundle.characters)
            .filter((c) => c.characterId !== ctx.characterId)
            .map((c) => ({ characterId: c.characterId, displayName: c.displayName, accent: c.accent, space: c.space })),
        },
      };

  try {
    const result = await brain.decide(brainInput);
    const parsed = parseBriefFromBrain(result.outputJson, input.runId, ctx.characterId, existing ?? undefined);
    if (parsed) {
      const brief: DesignBrief = DesignBriefSchema.parse({
        ...parsed,
        composedAt: new Date().toISOString(),
        iteration,
        source: "brain",
        model: result.model,
      });
      return { brief, source: "brain" };
    }
  } catch {
    // fall through to canonical
  }
  const fallbackBase = canonicalBriefFromContext(ctx, input.runId);
  const brief: DesignBrief = DesignBriefSchema.parse({
    ...fallbackBase,
    composedAt: new Date().toISOString(),
    iteration,
  });
  return { brief, source: "canonical-fallback" };
}

export const briefRunner: ArtLabRunner = {
  kind: "brief",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    try {
      const { brief, source } = await composeOrRefineBrief(input);
      writeBrief(input.runDir, brief);

      // Brainstorm-mode off → auto-approve the brief by advancing to
      // generating-concepts directly. The state-machine walker will pick it
      // up on the next tick.
      if (process.env.ARTLAB_BRAINSTORM_MODE === "off") {
        const state = readRunStateSnapshot(input.runDir);
        if (state) {
          writeRunStateSnapshot(input.runDir, {
            ...state,
            phase: "generating-concepts",
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return {
        runnerKind: "brief",
        status: "ok",
        durationMs: Date.now() - startedAt,
        artifacts: { briefPath: join(input.runDir, "brief.json"), source, iteration: brief.iteration },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRoutingFailure = message.includes("no character context") || message.includes("needs clarification");
      return {
        runnerKind: "brief",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { errorMessage: message },
        blockerHint: isRoutingFailure ? "needs-human" : "provider-blocked",
        failureCode: isRoutingFailure ? "no-character-match" : "brief-compose-failed",
      };
    }
  },
};
