import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");
const toolingRoot = ".artlab/tooling/cutout";
const modelManifestPath = join(toolingRoot, "model-manifest.json");
const pythonPath = join(toolingRoot, "venv", "bin", "python");

function approvedRembgCandidate(): Record<string, unknown> | undefined {
  if (!existsSync(modelManifestPath)) return undefined;

  const manifest = JSON.parse(readFileSync(modelManifestPath, "utf8")) as {
    candidates?: Array<Record<string, unknown>>;
  };

  return manifest.candidates?.find((candidate) =>
    candidate.adapter === "rembg" &&
    typeof candidate.modelWeightLicense === "string" &&
    !/requires[- ]project[- ]license[- ]review|pending|unknown|unclear/i.test(candidate.modelWeightLicense),
  );
}

describe.skipIf(!existsSync(pythonPath) || !approvedRembgCandidate())("rembg cutout worker smoke", () => {
  it("runs the cached rembg worker offline on a no-alpha simple-backdrop source", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-rembg-smoke-"));
    const sourcePath = join(root, "source.jpg");
    const selectionPath = join(root, "selection.json");
    const planRoot = join(root, "generation");
    const inboxDirectory = join(root, "inbox", "slot-rembg-smoke");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const candidate = approvedRembgCandidate()!;

    mkdirSync(inboxDirectory, { recursive: true });
    mkdirSync(planRoot, { recursive: true });
    await sharp({
      create: {
        width: 180,
        height: 260,
        channels: 3,
        background: "#e5dcc6",
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 72,
              height: 170,
              channels: 3,
              background: "#642c4e",
            },
          }).png().toBuffer(),
          left: 54,
          top: 44,
        },
      ])
      .jpeg({ quality: 96 })
      .toFile(sourcePath);
    writeFileSync(selectionPath, JSON.stringify({
      schemaVersion: "tower-cutout-model-selection-v1",
      status: "ready",
      winners: {
        character: {
          candidateId: candidate.id,
          modelName: candidate.modelName,
          modelVersion: candidate.modelVersion,
          score: 0.95,
        },
      },
      blocked: [],
      missingSubjectTypes: [],
      candidateManifest: [candidate],
    }));
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "slot-rembg-smoke",
      attempt: 1,
      capturedFile: sourcePath,
      qualityWarnings: ["source-missing-alpha"],
      metadata: { width: 180, height: 260, format: "jpeg", hasAlpha: false },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "rembg-smoke",
      assetType: "character",
      name: "Otis",
      planRoot,
      slots: [
        {
          slotId: "slot-rembg-smoke",
          inboxDirectory,
          expectedInboxFile: sourcePath,
          cutout: {
            required: true,
            subjectType: "character",
            topologyType: "standard-character",
            expectedProps: [],
            backdropContract: "premium-simple-backdrop-v1",
            backdropRequirements: [],
            shadowPolicy: "app-owned",
            thresholds: {
              minimumLongEdge: 180,
              minimumShortEdge: 120,
              borderSamplePixels: 2,
              borderAlphaThreshold: 32,
              minimumPadding: { top: 0.02, right: 0.02, bottom: 0.02, left: 0.02 },
              maxTinyIslands: 20,
              maxTinyIslandCanvasRatio: 0.001,
              maxTotalIslandCanvasRatio: 0.01,
              maxHoleSubjectRatio: 0.2,
              maxTotalHoleSubjectRatio: 0.2,
              haloMeanAlphaMax: 20,
              haloP99AlphaMax: 80,
              maxBackdropRemnantEdgeRatio: 0.02,
              minimumForegroundMeanConfidence: 0.92,
              minimumForegroundP5Confidence: 0.8,
              maximumBackgroundP95Confidence: 0.2,
            },
            review: {
              showOriginalSource: true,
              showCheckerboardCutout: true,
              showDarkPreview: true,
              showLightPreview: true,
              showTowerShadowPreview: true,
              badges: ["cutout", "alpha", "dimensions", "crop", "halo", "props"],
            },
          },
        },
      ],
    }));
    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "cutout-auto",
      "--plan",
      planPath,
      "--tooling-root",
      toolingRoot,
      "--model-selection",
      selectionPath,
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        TOWER_CUTOUT_SMOKE_CANDIDATE: JSON.stringify(candidate),
      },
      stdio: "pipe",
    });
    const receipt = JSON.parse(readFileSync(join(inboxDirectory, "cutout-receipt.json"), "utf8")) as {
      outputPath: string;
      status: string;
    };

    expect(receipt.status).toBe("passed");
    expect(existsSync(receipt.outputPath)).toBe(true);
    expect((await sharp(receipt.outputPath).metadata()).hasAlpha).toBe(true);
  }, 30000);
});
