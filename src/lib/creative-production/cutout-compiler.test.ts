import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  BANNED_PRODUCTION_CUTOUT_TERMS,
  PREMIUM_SIMPLE_BACKDROP_CONTRACT,
  buildCutoutReadinessScore,
  createDefaultCutoutContract,
  evaluateCutoutAlpha,
  selectCutoutModelWinners,
} from "./index";

function sha256File(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function permissiveCutoutThresholds() {
  return {
    minimumLongEdge: 10,
    minimumShortEdge: 10,
    borderSamplePixels: 1,
    borderAlphaThreshold: 32,
    minimumPadding: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
    maxTinyIslands: 5,
    maxTinyIslandCanvasRatio: 0.0001,
    maxTotalIslandCanvasRatio: 0.0003,
    maxHoleSubjectRatio: 0.0015,
    maxTotalHoleSubjectRatio: 0.005,
    haloMeanAlphaMax: 4,
    haloP99AlphaMax: 18,
    maxBackdropRemnantEdgeRatio: 0.005,
    minimumForegroundMeanConfidence: 0.92,
    minimumForegroundP5Confidence: 0.8,
    maximumBackgroundP95Confidence: 0.2,
  };
}

describe("fail-closed visual cutout compiler", () => {
  it("creates strict per-slot cutout contracts with premium simple backdrop language", () => {
    const contract = createDefaultCutoutContract({
      assetType: "character",
      name: "Otis",
      slotId: "otis-winter-layered-working",
      outfit: "winter-layered",
      pose: "working",
    });

    expect(contract.required).toBe(true);
    expect(contract.subjectType).toBe("hair-beard-character");
    expect(contract.topologyType).toBe("hair-beard-soft-body-held-props");
    expect(contract.expectedProps).toEqual(["badge", "keys", "held prop"]);
    expect(contract.backdropContract).toBe("premium-simple-backdrop-v1");
    expect(contract.shadowPolicy).toBe("app-owned");
    expect(contract.thresholds.minimumLongEdge).toBe(4096);
    expect(contract.thresholds.minimumShortEdge).toBe(2300);
    expect(PREMIUM_SIMPLE_BACKDROP_CONTRACT.join("\n")).toContain("no patterned walls");
    expect(PREMIUM_SIMPLE_BACKDROP_CONTRACT.join("\n")).toContain("no furniture or objects overlapping");
    expect(PREMIUM_SIMPLE_BACKDROP_CONTRACT.join("\n")).toContain("no cast or contact shadows touching");
  });

  it("allows natural interior negative space for standard Tower character sprites", () => {
    const contract = createDefaultCutoutContract({
      assetType: "character",
      name: "Mara",
      slotId: "mara-regular-idle",
    });

    expect(contract.subjectType).toBe("character");
    expect(contract.topologyType).toBe("standard-character");
    expect(contract.thresholds.allowInteriorNegativeSpace).toBe(true);
  });

  it("selects benchmark winners by subject type and blocks candidates without model-weight license evidence", () => {
    const selection = selectCutoutModelWinners({
      candidates: [
        {
          id: "character-model",
          adapter: "rembg",
          packageName: "rembg",
          packageVersion: "2.0.75",
          packageLicense: "MIT",
          modelName: "birefnet-general",
          modelVersion: "244",
          modelWeightSourceUrl: "https://example.invalid/birefnet.onnx",
          modelWeightLicense: "permissive",
          modelWeightSha256: "sha256:abc",
          cachedModelPath: ".artlab/tooling/cutout/models/birefnet.onnx",
          supports: [{ subjectType: "character" }],
        },
        {
          id: "prop-model",
          adapter: "rembg",
          packageName: "rembg",
          packageVersion: "2.0.75",
          packageLicense: "MIT",
          modelName: "isnet-general-use",
          modelVersion: "1",
          modelWeightSourceUrl: "https://example.invalid/isnet.onnx",
          modelWeightLicense: "permissive",
          modelWeightSha256: "sha256:def",
          cachedModelPath: ".artlab/tooling/cutout/models/isnet.onnx",
          supports: [{ subjectType: "prop" }],
        },
        {
          id: "blocked-ui-model",
          adapter: "rembg",
          packageName: "rembg",
          packageVersion: "2.0.75",
          packageLicense: "MIT",
          modelName: "unknown-ui",
          modelVersion: "1",
          modelWeightSourceUrl: "",
          modelWeightLicense: "",
          modelWeightSha256: "",
          cachedModelPath: ".artlab/tooling/cutout/models/ui.onnx",
          supports: [{ subjectType: "ui-object" }],
        },
      ],
      fixtureScores: [
        { candidateId: "character-model", subjectType: "character", fixtureSet: "fresh-natural-canary", score: 0.94 },
        { candidateId: "prop-model", subjectType: "prop", fixtureSet: "fresh-natural-canary", score: 0.91 },
        { candidateId: "blocked-ui-model", subjectType: "ui-object", fixtureSet: "fresh-natural-canary", score: 0.99 },
      ],
      requiredSubjectTypes: ["character", "prop", "ui-object"],
    });

    expect(selection.status).toBe("blocked");
    expect(selection.winners.character?.candidateId).toBe("character-model");
    expect(selection.winners.prop?.candidateId).toBe("prop-model");
    expect(selection.blocked).toContainEqual(expect.objectContaining({
      candidateId: "blocked-ui-model",
      reason: expect.stringContaining("model weight license"),
    }));
    expect(selection.missingSubjectTypes).toEqual(["ui-object"]);
  });

  it("verifies cached model files and blocks hash mismatches during model selection", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-model-hash-"));
    const modelPath = join(root, "model.bin");

    mkdirSync(root, { recursive: true });
    writeFileSync(modelPath, "real cached model bytes");

    const ready = selectCutoutModelWinners({
      candidates: [
        {
          id: "cached-character-model",
          adapter: "simple-backdrop-segmentation",
          packageName: "tower-local-cutout",
          packageVersion: "1.0.0",
          packageLicense: "Tower internal",
          modelName: "simple-backdrop-v1",
          modelVersion: "1",
          modelWeightSourceUrl: "local://tower/simple-backdrop-v1",
          modelWeightLicense: "Tower internal",
          modelWeightSha256: sha256File(modelPath),
          cachedModelPath: modelPath,
          supports: [{ subjectType: "character" }],
        },
      ],
      fixtureScores: [
        { candidateId: "cached-character-model", subjectType: "character", fixtureSet: "fresh-natural-canary", score: 0.96 },
      ],
      requiredSubjectTypes: ["character"],
      verifyCachedFiles: true,
    });
    const blocked = selectCutoutModelWinners({
      candidates: [
        {
          id: "bad-hash-character-model",
          adapter: "simple-backdrop-segmentation",
          packageName: "tower-local-cutout",
          packageVersion: "1.0.0",
          packageLicense: "Tower internal",
          modelName: "simple-backdrop-v1",
          modelVersion: "1",
          modelWeightSourceUrl: "local://tower/simple-backdrop-v1",
          modelWeightLicense: "Tower internal",
          modelWeightSha256: "sha256:not-the-real-hash",
          cachedModelPath: modelPath,
          supports: [{ subjectType: "character" }],
        },
      ],
      fixtureScores: [
        { candidateId: "bad-hash-character-model", subjectType: "character", fixtureSet: "fresh-natural-canary", score: 0.96 },
      ],
      requiredSubjectTypes: ["character"],
      verifyCachedFiles: true,
    });

    expect(ready.status).toBe("ready");
    expect(blocked.status).toBe("blocked");
    expect(blocked.blocked[0]?.reason).toContain("cached model hash mismatch");
  });

  it("blocks placeholder model-weight license review text from production selection", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-license-placeholder-"));
    const modelPath = join(root, "model.bin");

    mkdirSync(root, { recursive: true });
    writeFileSync(modelPath, "cached model bytes");

    const selection = selectCutoutModelWinners({
      candidates: [
        {
          id: "unreviewed-license-model",
          adapter: "simple-backdrop-segmentation",
          packageName: "tower-local-cutout",
          packageVersion: "1.0.0",
          packageLicense: "Tower internal",
          modelName: "simple-backdrop-v1",
          modelVersion: "1",
          modelWeightSourceUrl: "local://tower/simple-backdrop-v1",
          modelWeightLicense: "requires-project-license-review",
          modelWeightSha256: sha256File(modelPath),
          cachedModelPath: modelPath,
          supports: [{ subjectType: "character" }],
        },
      ],
      fixtureScores: [
        { candidateId: "unreviewed-license-model", subjectType: "character", fixtureSet: "fresh-natural-canary", score: 0.99 },
      ],
      requiredSubjectTypes: ["character"],
      verifyCachedFiles: true,
    });

    expect(selection.status).toBe("blocked");
    expect(selection.blocked[0]?.reason).toContain("model weight license is still pending review");
  });

  it("fails cutout QA for cropped subjects, border alpha, islands, holes, and halos", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-qa-"));
    const source = join(root, "bad-cutout.png");
    const width = 12;
    const height = 12;
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = ((y * width) + x) * 4;
        const body = x >= 1 && x <= 8 && y >= 0 && y <= 9;
        const hole = x >= 4 && x <= 5 && y >= 4 && y <= 5;
        const island = x === 10 && y === 10;
        const halo = x === 9 && y >= 2 && y <= 8;

        pixels[offset] = 130;
        pixels[offset + 1] = 70;
        pixels[offset + 2] = 60;
        pixels[offset + 3] = body && !hole ? 255 : island ? 255 : halo ? 30 : 0;
      }
    }

    await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(source);
    const report = await evaluateCutoutAlpha({
      imagePath: source,
      thresholds: {
        minimumLongEdge: 10,
        minimumShortEdge: 10,
        borderSamplePixels: 1,
        borderAlphaThreshold: 32,
        minimumPadding: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
        maxTinyIslands: 0,
        maxTinyIslandCanvasRatio: 0.0001,
        maxTotalIslandCanvasRatio: 0.0001,
        maxHoleSubjectRatio: 0.01,
        maxTotalHoleSubjectRatio: 0.01,
        haloMeanAlphaMax: 4,
        haloP99AlphaMax: 18,
        maxBackdropRemnantEdgeRatio: 0.005,
        minimumForegroundMeanConfidence: 0.92,
        minimumForegroundP5Confidence: 0.8,
        maximumBackgroundP95Confidence: 0.2,
      },
    });

    expect(report.status).toBe("failed");
    expect(report.failures).toEqual(expect.arrayContaining([
      "subject-cropped",
      "extra-islands",
      "alpha-holes",
      "edge-halo",
    ]));
    expect(report.badges.alpha).toBe("failed");
    expect(report.badges.crop).toBe("failed");
    expect(report.badges.halo).toBe("failed");
  });

  it("does not fail edge halo for tiny remnants already below the island-area limit", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-tiny-remnants-"));
    const source = join(root, "tiny-remnants.png");
    const width = 200;
    const height = 200;
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = ((y * width) + x) * 4;
        const body = x >= 50 && x <= 150 && y >= 40 && y <= 160;
        const tinyRemnant = x === 170 && y >= 80 && y <= 83;

        pixels[offset] = 130;
        pixels[offset + 1] = 70;
        pixels[offset + 2] = 60;
        pixels[offset + 3] = body ? 255 : tinyRemnant ? 120 : 0;
      }
    }

    await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(source);
    const report = await evaluateCutoutAlpha({
      imagePath: source,
      thresholds: permissiveCutoutThresholds(),
    });

    expect(report.status).toBe("passed");
    expect(report.metrics.haloP99Alpha).toBe(120);
    expect(report.badges.halo).toBe("passed");
  });

  it("does not flag prop loss from a noisy source saliency box when saliency pixels are retained", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-props-retained-"));
    const source = join(root, "cutout.png");
    const width = 100;
    const height = 100;
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = ((y * width) + x) * 4;
        const body = x >= 30 && x <= 70 && y >= 30 && y <= 70;

        pixels[offset] = 120;
        pixels[offset + 1] = 80;
        pixels[offset + 2] = 70;
        pixels[offset + 3] = body ? 255 : 0;
      }
    }

    await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(source);
    const report = await evaluateCutoutAlpha({
      imagePath: source,
      thresholds: permissiveCutoutThresholds(),
      expectedProps: ["keys"],
      sourceSaliencyBounds: { left: 0, top: 0, right: 99, bottom: 99 },
      sourceSaliencyPixels: 1700,
    });

    expect(report.status).toBe("passed");
    expect(report.failures).not.toContain("prop-lost");
    expect(report.badges.props).toBe("passed");
  });

  it("flags prop loss when both saliency box and saliency pixels shrink materially", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-props-lost-"));
    const source = join(root, "cutout.png");
    const width = 100;
    const height = 100;
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = ((y * width) + x) * 4;
        const body = x >= 30 && x <= 70 && y >= 30 && y <= 70;

        pixels[offset] = 120;
        pixels[offset + 1] = 80;
        pixels[offset + 2] = 70;
        pixels[offset + 3] = body ? 255 : 0;
      }
    }

    await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(source);
    const report = await evaluateCutoutAlpha({
      imagePath: source,
      thresholds: permissiveCutoutThresholds(),
      expectedProps: ["keys"],
      sourceSaliencyBounds: { left: 0, top: 0, right: 99, bottom: 99 },
      sourceSaliencyPixels: 5000,
    });

    expect(report.status).toBe("failed");
    expect(report.failures).toContain("prop-lost");
    expect(report.badges.props).toBe("failed");
  });

  it("builds readiness from source separation, framing, subject complexity, benchmark, and canary scores", () => {
    const ready = buildCutoutReadinessScore({
      backdropSeparation: 0.94,
      sourceFraming: 0.95,
      subjectComplexityFit: 0.9,
      modelBenchmark: 0.93,
      canaryCutout: 0.94,
    });
    const blocked = buildCutoutReadinessScore({
      backdropSeparation: 0.74,
      sourceFraming: 0.95,
      subjectComplexityFit: 0.9,
      modelBenchmark: 0.93,
      canaryCutout: 0.94,
    });

    expect(ready.status).toBe("ready");
    expect(ready.score).toBeGreaterThanOrEqual(0.9);
    expect(blocked.status).toBe("blocked");
    expect(blocked.reasons).toContain("backdrop-separation-below-threshold");
  });

  it("keeps the production banned-term list focused on legacy matte instructions", () => {
    expect(BANNED_PRODUCTION_CUTOUT_TERMS).toEqual([
      "#00ff00",
      "chroma",
      "green matte",
      "extract-alpha",
    ]);
  });
});
