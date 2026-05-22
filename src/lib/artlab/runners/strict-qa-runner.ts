import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  buildAppPreviewBoard,
  buildFinalUploadReadyReviewBoard,
  type CreativeAppPreviewChecks,
  type CreativeFinalAsset,
} from "@/lib/artlab/review/review";
import { runCoherenceCheck } from "@/lib/artlab/coherence/strict-qa-wiring";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

interface AssetDoctorEntry {
  cutoutPath: string;
  alpha: boolean;
  notes: string[];
}

interface RepairPlanEntry {
  cutoutPath: string;
  reason: string;
  remediation: string;
}

const PASSED_CHECKS: CreativeAppPreviewChecks = {
  desktop: { status: "passed", evidence: "auto-passed (mock smoke path)" },
  mobile: { status: "passed", evidence: "auto-passed (mock smoke path)" },
  reducedMotion: { status: "passed", evidence: "auto-passed (mock smoke path)" },
  fallback: { status: "passed", evidence: "auto-passed (mock smoke path)" },
  brokenImage: { status: "passed", evidence: "auto-passed (mock smoke path)" },
  crop: { status: "passed", evidence: "auto-passed (mock smoke path)" },
  overlap: { status: "passed", evidence: "auto-passed (mock smoke path)" },
};

function publishBoards(runDir: string, runId: string, entries: AssetDoctorEntry[]): void {
  const boardsDir = join(runDir, "boards");
  if (!existsSync(boardsDir)) mkdirSync(boardsDir, { recursive: true });
  const finalAssets: CreativeFinalAsset[] = entries.map((entry, idx) => ({
    slotId: `slot-${idx + 1}`,
    label: `Slot ${idx + 1}`,
    localImagePath: `cutouts/${relative(join(runDir, "cutouts"), entry.cutoutPath)}`,
    status: "qa-passed",
    receipts: [`cutout://${entry.cutoutPath}`],
    evidence: entry.notes,
    warnings: [],
    blockers: [],
  }));
  const finalBoard = buildFinalUploadReadyReviewBoard({ runId, assets: finalAssets });
  writeFileSync(join(boardsDir, "final-board.json"), JSON.stringify(finalBoard.actionManifest, null, 2));
  const previewSource = finalAssets[0]?.localImagePath ?? "cutouts/preview.png";
  const previewBoard = buildAppPreviewBoard({
    runId,
    previewTitle: `Run ${runId} preview`,
    assetLocalPath: previewSource,
    checks: PASSED_CHECKS,
  });
  writeFileSync(join(boardsDir, "app-preview.json"), JSON.stringify(previewBoard.actionManifest, null, 2));
}

export const strictQaRunner: ArtLabRunner = {
  kind: "strict-qa",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const cutoutDir = join(input.runDir, "cutouts");
    const entries: AssetDoctorEntry[] = [];
    const repairs: RepairPlanEntry[] = [];
    if (existsSync(cutoutDir)) {
      for (const file of readdirSync(cutoutDir).filter((f) => f.endsWith(".png"))) {
        const path = join(cutoutDir, file);
        let alpha = false;
        try {
          const parsed = JSON.parse(readFileSync(path, "utf8")) as { alpha?: boolean };
          alpha = parsed.alpha === true;
        } catch {
          alpha = false;
        }
        entries.push({ cutoutPath: path, alpha, notes: alpha ? [] : ["missing alpha"] });
        if (!alpha) {
          repairs.push({ cutoutPath: path, reason: "alpha-missing", remediation: "rerun-cutout" });
        }
      }
    }
    writeFileSync(join(input.runDir, "asset-doctor.json"), JSON.stringify({ entries }, null, 2));
    writeFileSync(join(input.runDir, "repair-plan.json"), JSON.stringify({ repairs }, null, 2));
    if (repairs.length > 0) {
      return {
        runnerKind: "strict-qa",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { entries, repairs },
        blockerHint: "repair-required",
        failureCode: "repair-plan-nonempty",
      };
    }
    const coherence = await runCoherenceCheck({ runDir: input.runDir, workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? "" });
    writeFileSync(join(input.runDir, "coherence-report.json"), JSON.stringify(coherence, null, 2));
    if (coherence.diversity && !coherence.diversity.passed) {
      return {
        runnerKind: "strict-qa",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { entries, repairs, coherence },
        blockerHint: "style-failed",
        failureCode: `coherence:${coherence.diversity.failureCodes.join(",")}`,
      };
    }
    publishBoards(input.runDir, input.runId, entries);
    return {
      runnerKind: "strict-qa",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { entries, repairs, coherence, boardsDir: join(input.runDir, "boards") },
    };
  },
};
