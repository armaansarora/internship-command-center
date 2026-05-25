import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { join, resolve } from "node:path";
import {
  evaluateCreativePromotionFirewall,
  promoteCreativeAssetsTransactionally,
  type CreativePromotionActionManifestSummary,
  type CreativePromotionStagedAsset,
} from "@/lib/artlab/promotion/promotion";
import { appendStyleWin } from "@/lib/artlab/memory/style-ledger";
import { autoCommitPromotion } from "@/lib/artlab/daemon/git-commit";
import { displayFor } from "@/lib/artlab/intake/known-cast";
import { loadTowerContext, pickCharacterContext } from "@/lib/artlab/context/tower-context";
import { createClaudeBrain } from "@/lib/artlab/orchestrator/claude-brain";
import { createGeminiBrain } from "@/lib/artlab/orchestrator/gemini-brain";
import { createLoggedBrain } from "@/lib/artlab/orchestrator/logged-brain";
import { decideWithMockBrain, type ArtLabLlmBrain } from "@/lib/artlab/orchestrator/llm-brain";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

async function composeAndPersistPromotionCelebration(input: {
  workspaceRoot: string;
  runDir: string;
  characterId: string;
  assetCount: number;
  spendCents: number;
  capCents: number;
}): Promise<void> {
  const bundle = await loadTowerContext({ workspaceRoot: input.workspaceRoot });
  const ctx = pickCharacterContext(bundle, input.characterId);
  if (!ctx) return;
  const brain = buildBrainForPromotion(input.workspaceRoot);
  const result = await brain.decide({
    kind: "compose-promotion-celebration",
    input: {
      characterContext: {
        characterId: ctx.characterId,
        displayName: ctx.displayName,
        title: ctx.title,
        space: ctx.space,
        accent: ctx.accent,
        visualArchetype: ctx.visualArchetype,
      },
      runId: input.runDir.split("/").pop()?.slice(0, 8) ?? "",
      assetCount: input.assetCount,
      liveUrl: `https://www.interntower.com/${ctx.space}`,
      spendCents: input.spendCents,
      capCents: input.capCents,
      castContinuity: Object.values(bundle.characters)
        .filter((c) => c.characterId !== ctx.characterId)
        .slice(0, 6)
        .map((c) => ({ characterId: c.characterId, displayName: c.displayName, accent: c.accent, space: c.space })),
    },
  });
  const text = (result.outputJson as { text?: unknown }).text;
  if (typeof text === "string" && text.length > 0) {
    writeFileSync(join(input.runDir, "promotion-celebration.json"), JSON.stringify({ text }, null, 2));
  }
}

function buildBrainForPromotion(workspaceRoot: string): ArtLabLlmBrain {
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

const REQUIRED_PHRASE = "approved for app";
const DEFAULT_CAP_CENTS = 350;

function readSpendFromRunState(runDir: string): { actualCents: number; capCents: number } {
  // run-state.json (when populated by the spend ledger) carries:
  //   spend: { actualCents, perRunCapCents?, monthlyCeilingCents? }
  // Promotion-celebration prefers per-run cap; falls back to monthly ceiling
  // and finally a sensible default so the message is never blank.
  try {
    const state = readRunStateSnapshot(runDir) as
      | (Awaited<ReturnType<typeof readRunStateSnapshot>> & {
          spend?: { actualCents?: number; perRunCapCents?: number; monthlyCeilingCents?: number };
        })
      | null;
    const spend = state?.spend;
    if (spend) {
      const actual = typeof spend.actualCents === "number" ? spend.actualCents : 0;
      const cap = typeof spend.perRunCapCents === "number"
        ? spend.perRunCapCents
        : (typeof spend.monthlyCeilingCents === "number" ? spend.monthlyCeilingCents : DEFAULT_CAP_CENTS);
      return { actualCents: actual, capCents: cap };
    }
  } catch { /* fall through */ }
  return { actualCents: 0, capCents: DEFAULT_CAP_CENTS };
}

function publicArtRoot(): string {
  return process.env.ARTLAB_PUBLIC_ART_ROOT ?? "/Users/armaanarora/Documents/The Tower/public/art";
}

function targetRelativeDir(input: ArtLabRunnerInput): string {
  if (input.assetType === "character" && input.characterId) {
    return join("lobby", input.characterId);
  }
  if (input.assetType === "environment") return join("backgrounds", input.runId);
  if (input.assetType === "ui-texture") return join("ui", input.runId);
  if (input.assetType === "animation") return join("animations", input.runId);
  return join("misc", input.runId);
}

function manifestPath(input: ArtLabRunnerInput): string {
  const root = publicArtRoot();
  if (input.assetType === "character") {
    return join(root, "..", "..", "src", "lib", "visual-assets", "approved-character-assets.generated.json");
  }
  return join(root, "..", "production-manifests", `${input.assetType}.json`);
}

function loadActionManifest(runDir: string, fileName: string): CreativePromotionActionManifestSummary {
  const path = join(runDir, "boards", fileName);
  if (!existsSync(path)) {
    return { exists: false, promotesOnAction: false, localImagePaths: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      promotesOnAction?: boolean;
      localImagePaths?: string[];
    };
    return {
      exists: true,
      promotesOnAction: parsed.promotesOnAction === true,
      localImagePaths: Array.isArray(parsed.localImagePaths) ? parsed.localImagePaths : [],
    };
  } catch {
    return { exists: false, promotesOnAction: false, localImagePaths: [] };
  }
}

function loadStrictQaPassed(runDir: string): boolean {
  const repair = join(runDir, "repair-plan.json");
  if (!existsSync(repair)) return false;
  try {
    const parsed = JSON.parse(readFileSync(repair, "utf8")) as { repairs?: unknown[] };
    return Array.isArray(parsed.repairs) && parsed.repairs.length === 0;
  } catch {
    return false;
  }
}

function loadApprovalPhrase(runDir: string): string {
  const approval = join(runDir, "approval.json");
  if (!existsSync(approval)) return "";
  try {
    const parsed = JSON.parse(readFileSync(approval, "utf8")) as { phrase?: string };
    return typeof parsed.phrase === "string" ? parsed.phrase.trim() : "";
  } catch {
    return "";
  }
}

function buildStagedAssets(runDir: string, targetDir: string): CreativePromotionStagedAsset[] {
  const cutouts = join(runDir, "cutouts");
  if (!existsSync(cutouts)) return [];
  return readdirSync(cutouts)
    .filter((file) => /\.(png|webp|jpe?g)$/i.test(file))
    .sort()
    .map((file, idx) => ({
      slotId: `slot-${idx + 1}`,
      sourcePath: join(cutouts, file),
      targetRelativePath: join(targetDir, file),
    }));
}

export const promotionRunner: ArtLabRunner = {
  kind: "promotion",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const phrase = loadApprovalPhrase(input.runDir);
    const strictQaPassed = loadStrictQaPassed(input.runDir);
    const finalBoard = loadActionManifest(input.runDir, "final-board.json");
    const appPreview = loadActionManifest(input.runDir, "app-preview.json");
    const targetDir = targetRelativeDir(input);
    const stagedAssets = buildStagedAssets(input.runDir, targetDir);

    const firewall = evaluateCreativePromotionFirewall({
      runId: input.runId,
      currentPhase: "promoting",
      approvalPhrase: phrase === REQUIRED_PHRASE ? REQUIRED_PHRASE : phrase,
      publicArtWritesAllowed: phrase === REQUIRED_PHRASE && strictQaPassed,
      strictQaPassed,
      finalBoardActionManifest: finalBoard,
      appPreviewActionManifest: appPreview,
      stagedAssets,
    });

    if (!firewall.allowed) {
      return {
        runnerKind: "promotion",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { firewallBlockers: firewall.blockers },
        blockerHint: "repair-required",
        failureCode: `firewall:${firewall.blockers.join(",")}`,
      };
    }

    const result = await promoteCreativeAssetsTransactionally({
      runId: input.runId,
      currentPhase: "promoting",
      approvalPhrase: REQUIRED_PHRASE,
      publicArtWritesAllowed: true,
      strictQaPassed: true,
      finalBoardActionManifest: finalBoard,
      appPreviewActionManifest: appPreview,
      stagedAssets,
      publicArtRoot: publicArtRoot(),
      manifestPath: manifestPath(input),
      receiptPath: join(input.runDir, "promotion-receipt.json"),
    });

    if (input.assetType === "character" && input.characterId) {
      const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT;
      if (workspaceRoot) {
        const memoryDir = join(workspaceRoot, "memory");
        if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
        try {
          appendStyleWin(memoryDir, {
            characterId: input.characterId,
            promotedAt: result.receipt.promotedAt,
            winningTechniques: ["artlab-pipeline"],
            promptHash: `run:${input.runId}`,
            totalCostCents: 0,
          });
        } catch { /* memory write failure must not break promotion */ }

        // Brain-authored promotion celebration — phase-notifier picks this
        // up and renders it when state hits closed. Best-effort.
        // Read real spend from run-state.json so the celebration says the
        // actual cost instead of a placeholder $0.00.
        const realSpend = readSpendFromRunState(input.runDir);
        try {
          await composeAndPersistPromotionCelebration({
            workspaceRoot,
            runDir: input.runDir,
            characterId: input.characterId,
            assetCount: result.promotedPaths.length,
            spendCents: realSpend.actualCents,
            capCents: realSpend.capCents,
          });
        } catch { /* non-fatal */ }
      }
    }

    // Auto-commit + push so the user's "Live now" link actually resolves to
    // the new asset after Vercel deploys. Path-scoped staging is enforced
    // inside autoCommitPromotion — the daemon can ONLY stage files under
    // public/art/ or the generated manifest JSON.
    const projectRoot = process.env.ARTLAB_PROJECT_ROOT;
    let gitResult: ReturnType<typeof autoCommitPromotion> | null = null;
    if (projectRoot && process.env.ARTLAB_AUTO_COMMIT !== "off") {
      const promotedAbs = result.promotedPaths.map((p) => resolve(p));
      const manifestAbs = resolve(manifestPath(input));
      try {
        gitResult = autoCommitPromotion({
          projectRoot,
          runId: input.runId,
          displayName: input.characterId ? displayFor(input.characterId).displayName : undefined,
          promotedPaths: promotedAbs,
          manifestPath: manifestAbs,
          skipPush: process.env.ARTLAB_AUTO_PUSH === "off",
        });
        writeFileSync(
          join(input.runDir, "git-commit-result.json"),
          JSON.stringify(gitResult, null, 2),
        );
      } catch (err) {
        // Auto-commit failures must not break promotion — record + continue.
        try {
          writeFileSync(
            join(input.runDir, "git-commit-result.json"),
            JSON.stringify({
              status: "failed",
              reason: err instanceof Error ? err.message : String(err),
              stagedPaths: [],
            }, null, 2),
          );
        } catch { /* ignore */ }
      }
    }

    return {
      runnerKind: "promotion",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: {
        promotedPaths: result.promotedPaths,
        receipt: result.receipt,
        gitResult,
        // Promote-time push status flag — phase-notifier reads this to warn
        // the user when commit succeeded but push failed (so "Live now" link
        // won't actually deploy until manual push).
        pushFailed: pushFailed(gitResult),
        pushFailureReason: pushFailureReason(gitResult),
      },
    };
  },
};

function pushFailed(gitResult: ReturnType<typeof autoCommitPromotion> | null): boolean {
  if (!gitResult) return false;
  if (gitResult.status === "committed" && !gitResult.pushedTo) return true;
  if (gitResult.status === "failed") return true;
  return false;
}

function pushFailureReason(gitResult: ReturnType<typeof autoCommitPromotion> | null): string | undefined {
  if (!gitResult) return undefined;
  if (gitResult.status === "committed" && !gitResult.pushedTo) return gitResult.reason ?? "push failed";
  if (gitResult.status === "failed") return gitResult.reason ?? "commit failed";
  return undefined;
}
