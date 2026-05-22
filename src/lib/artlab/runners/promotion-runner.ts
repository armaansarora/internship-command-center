import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateCreativePromotionFirewall,
  promoteCreativeAssetsTransactionally,
  type CreativePromotionActionManifestSummary,
  type CreativePromotionStagedAsset,
} from "@/lib/artlab/promotion/promotion";
import { appendStyleWin } from "@/lib/artlab/memory/style-ledger";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const REQUIRED_PHRASE = "approved for app";

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
      }
    }

    return {
      runnerKind: "promotion",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { promotedPaths: result.promotedPaths, receipt: result.receipt },
    };
  },
};
