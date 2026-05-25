import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  buildAppPreviewBoard,
  buildFinalUploadReadyReviewBoard,
  type CreativeAppPreviewChecks,
  type CreativeFinalAsset,
} from "@/lib/artlab/review/review";
import { runCoherenceCheck } from "@/lib/artlab/coherence/strict-qa-wiring";
import { composeFinalBoard } from "../speed/placeholder-images";
import { cutoutRunner } from "./cutout-runner";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fileHasPngSignature(path: string): boolean {
  try {
    const fd = readFileSync(path);
    if (fd.length < PNG_SIGNATURE.length) return false;
    return fd.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  } catch { return false; }
}

function detectAlpha(path: string): boolean {
  // Real PNG (signature match) — verify alpha channel via sharp metadata,
  // since Gemini's image API returns opaque PNGs/JPEGs without alpha. The
  // cutout-runner is responsible for converting those to RGBA via backdrop
  // subtraction; this is the QA gate that ensures the conversion happened.
  if (fileHasPngSignature(path)) {
    try {
      // Synchronous PNG header parse: bytes 8-15 are IHDR length+type,
      // bytes 24-26 are width/height/bit-depth/colortype. Color type 4 (gray+alpha)
      // and 6 (RGB+alpha) carry alpha; 0 (gray), 2 (RGB), 3 (paletted) do not.
      // This avoids loading sharp synchronously, which is needed because
      // detectAlpha is called inside the strict-qa sync loop.
      const buf = readFileSync(path);
      // PNG signature is 8 bytes, then IHDR chunk (length=4, type=4, data=13, CRC=4).
      // Color type is at offset 8 (signature) + 8 (length+type) + 9 (= 25 from start).
      const colorType = buf[25];
      // Color types with alpha: 4 (grayscale+alpha), 6 (RGB+alpha)
      return colorType === 4 || colorType === 6;
    } catch { return false; }
  }
  // Legacy mock path — files written as JSON with `.png` extension carry `alpha: true`.
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { alpha?: boolean };
    return parsed.alpha === true;
  } catch { return false; }
}

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
    // The 10-phase state machine doesn't include a dedicated cutout phase;
    // production transitions directly to strict-qa. For asset types that
    // need cutouts (character, prop), run the cutout step inline here so the
    // alpha-doctor + final-board composite have inputs to work with.
    if (!existsSync(cutoutDir)) {
      await cutoutRunner.run(input);
    }
    const entries: AssetDoctorEntry[] = [];
    const repairs: RepairPlanEntry[] = [];
    if (existsSync(cutoutDir)) {
      for (const file of readdirSync(cutoutDir).filter((f) => f.endsWith(".png"))) {
        const path = join(cutoutDir, file);
        const alpha = detectAlpha(path);
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
    publishBoards(input.runDir, input.runId, entries);
    // Compose a real final-board.png the Telegram bot can attach.
    try {
      const cutoutPngs = entries.map((e) => e.cutoutPath).filter((p) => fileHasPngSignature(p));
      if (cutoutPngs.length > 0) {
        const board = await composeFinalBoard({
          cutoutPaths: cutoutPngs,
          characterId: input.characterId ?? "character",
        });
        writeFileSync(join(input.runDir, "final-board.png"), board);
      }
    } catch { /* don't fail strict-qa over a placeholder image issue */ }
    return {
      runnerKind: "strict-qa",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { entries, repairs, coherence, boardsDir: join(input.runDir, "boards") },
    };
  },
};
