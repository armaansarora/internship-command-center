import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");
const realGeminiOtisSource = resolve(
  ".artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-working/otis__winter-layered__working__source-v001__api-lane-01.png",
);

function sha256File(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function realGeminiContract() {
  return {
    required: true,
    subjectType: "character",
    topologyType: "hair-beard-soft-body-held-props",
    expectedProps: ["badge", "keys", "held prop"],
    backdropContract: "premium-simple-backdrop-v1",
    backdropRequirements: [],
    shadowPolicy: "app-owned",
    thresholds: {
      minimumLongEdge: 4096,
      minimumShortEdge: 2300,
      borderSamplePixels: 8,
      borderAlphaThreshold: 32,
      minimumPadding: { top: 0.03, right: 0.03, bottom: 0.02, left: 0.03 },
      maxTinyIslands: 8,
      maxTinyIslandCanvasRatio: 0.0002,
      maxTotalIslandCanvasRatio: 0.001,
      maxHoleSubjectRatio: 0.12,
      maxTotalHoleSubjectRatio: 0.12,
      haloMeanAlphaMax: 4,
      haloP99AlphaMax: 18,
      maxBackdropRemnantEdgeRatio: 0.005,
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
  };
}

describe.skipIf(!existsSync(realGeminiOtisSource))("real Gemini Otis cutout regression fixture", () => {
  it("runs a selected local model against an actual no-alpha Gemini Otis source with beard, hands, layered clothes, and props", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-real-gemini-cutout-"));
    const toolingRoot = join(root, ".artlab", "tooling", "cutout");
    const modelPath = join(toolingRoot, "models", "simple-backdrop-v1.json");
    const fixtureSetPath = join(root, "fixtures.json");
    const selectionPath = join(toolingRoot, "cutout-model-selection.json");
    const planRoot = join(root, "generation");
    const inboxDirectory = join(root, "inbox", "otis-winter-layered-working");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const contract = realGeminiContract();

    mkdirSync(join(toolingRoot, "models"), { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    mkdirSync(planRoot, { recursive: true });
    writeFileSync(modelPath, JSON.stringify({ adapter: "simple-backdrop-segmentation", version: 1 }));
    writeFileSync(fixtureSetPath, JSON.stringify({
      requiredSubjectTypes: ["character"],
      candidates: [
        {
          id: "simple-real-gemini-character-cutout",
          adapter: "simple-backdrop-segmentation",
          packageName: "tower-local-cutout",
          packageVersion: "1.0.0",
          packageLicense: "Tower internal",
          modelName: "simple-backdrop-v1",
          modelVersion: "1",
          modelWeightSourceUrl: "local://tower/simple-backdrop-v1",
          modelWeightLicense: "Tower internal approved fixture",
          modelWeightSha256: sha256File(modelPath),
          cachedModelPath: modelPath,
          supports: [{ subjectType: "character" }],
        },
      ],
      fixtures: [
        {
          id: "actual-gemini-otis-winter-layered-working",
          sourcePath: realGeminiOtisSource,
          subjectType: "character",
          fixtureSet: "fresh-natural-canary",
          contract,
        },
      ],
    }));
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "api-lane-01__otis-winter-layered-working",
      attempt: 1,
      capturedFile: realGeminiOtisSource,
      qualityWarnings: ["source-missing-alpha", "source-mime-image-jpeg"],
      metadata: await sharp(realGeminiOtisSource).metadata(),
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "actual-gemini-otis-cutout-regression",
      assetType: "character",
      name: "Otis",
      planRoot,
      sourceRequirements: { minimumLongEdge: 4096, minimumShortEdge: 2300 },
      slots: [
        {
          slotId: "api-lane-01__otis-winter-layered-working",
          baseSlotId: "otis-winter-layered-working",
          inboxDirectory,
          expectedInboxFile: realGeminiOtisSource,
          cutout: contract,
        },
      ],
    }));

    const benchmarkOutput = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "cutout-benchmark",
      "--fixture-set",
      fixtureSetPath,
      "--model-selection",
      selectionPath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const cutoutOutput = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "cutout-auto",
      "--plan",
      planPath,
      "--model-selection",
      selectionPath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const receipt = JSON.parse(readFileSync(join(inboxDirectory, "cutout-receipt.json"), "utf8")) as {
      status: string;
      outputPath: string;
      sourceSaliencyBounds?: unknown;
      qa: { status: string; failures: string[] };
    };

    expect(benchmarkOutput).toContain("Cutout model selection: ready");
    expect(cutoutOutput).toContain("Cutout auto: passed");
    expect(receipt.status).toBe("passed");
    expect(receipt.sourceSaliencyBounds).toBeTruthy();
    expect(receipt.qa.status).toBe("passed");
    expect(receipt.qa.failures).not.toContain("prop-lost");
    expect((await sharp(receipt.outputPath).metadata()).hasAlpha).toBe(true);
  }, 30000);
});
