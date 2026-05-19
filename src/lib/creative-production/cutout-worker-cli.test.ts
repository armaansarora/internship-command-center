import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

function sha256(value: Buffer | string): string {
  const data = typeof value === "string" ? readFileSync(value) : value;

  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

function tinyContract() {
  return {
    required: true,
    subjectType: "character",
    topologyType: "hair-beard-soft-body-held-props",
    expectedProps: ["badge", "keys"],
    backdropContract: "premium-simple-backdrop-v1",
    backdropRequirements: [],
    shadowPolicy: "app-owned",
    thresholds: {
      minimumLongEdge: 160,
      minimumShortEdge: 120,
      borderSamplePixels: 2,
      borderAlphaThreshold: 32,
      minimumPadding: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 },
      maxTinyIslands: 2,
      maxTinyIslandCanvasRatio: 0.0005,
      maxTotalIslandCanvasRatio: 0.001,
      maxHoleSubjectRatio: 0.01,
      maxTotalHoleSubjectRatio: 0.02,
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

async function writeGeminiLikeNoAlphaSource(path: string): Promise<void> {
  const width = 160;
  const height = 240;
  const pixels = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * 3;
      const body = x >= 48 && x <= 112 && y >= 46 && y <= 208;
      const head = x >= 60 && x <= 100 && y >= 24 && y <= 62;
      const beard = x >= 63 && x <= 97 && y >= 54 && y <= 78;
      const badge = x >= 96 && x <= 106 && y >= 98 && y <= 108;
      const keys = x >= 108 && x <= 120 && y >= 128 && y <= 144;
      const subject = body || head || beard || badge || keys;

      pixels[offset] = subject ? badge || keys ? 196 : 92 : 228;
      pixels[offset + 1] = subject ? badge || keys ? 154 : 42 : 219;
      pixels[offset + 2] = subject ? badge || keys ? 84 : 76 : 198;
    }
  }

  await sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 96 }).toFile(path);
}

describe("cutout worker CLI", () => {
  it("benchmarks a real selected local worker and turns a no-alpha Gemini-like source into a transparent PNG", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-cutout-worker-"));
    const projectRoot = process.cwd();
    const tsx = join(projectRoot, "node_modules/.bin/tsx");
    const adapterScript = join(projectRoot, "scripts/creative-generation-adapter.ts");
    const toolingRoot = join(root, ".artlab", "tooling", "cutout");
    const modelPath = join(toolingRoot, "models", "simple-backdrop-v1.json");
    const sourcePath = join(root, "fixture-source.jpg");
    const fixtureSetPath = join(root, "fixtures.json");
    const selectionPath = join(toolingRoot, "cutout-model-selection.json");
    const planRoot = join(root, "generation", "gemini-api-v3", "canary");
    const gatePath = join(root, "generation", "gemini-api-v3", "canary-gate.json");
    const inboxDirectory = join(root, "inbox", "slot-otis-canary");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const fromRoot = (path: string): string => path.startsWith(".artlab/")
      ? join(root, path)
      : path;

    mkdirSync(join(toolingRoot, "models"), { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    mkdirSync(planRoot, { recursive: true });
    writeFileSync(modelPath, JSON.stringify({ adapter: "simple-backdrop-segmentation", version: 1 }));
    await writeGeminiLikeNoAlphaSource(sourcePath);
    writeFileSync(fixtureSetPath, JSON.stringify({
      requiredSubjectTypes: ["character"],
      candidates: [
        {
          id: "simple-character-cutout",
          adapter: "simple-backdrop-segmentation",
          packageName: "tower-local-cutout",
          packageVersion: "1.0.0",
          packageLicense: "Tower internal",
          modelName: "simple-backdrop-v1",
          modelVersion: "1",
          modelWeightSourceUrl: "local://tower/simple-backdrop-v1",
          modelWeightLicense: "Tower internal test fixture",
          modelWeightSha256: sha256(modelPath),
          cachedModelPath: modelPath,
          supports: [{ subjectType: "character" }],
        },
      ],
      fixtures: [
        {
          id: "otis-no-alpha-natural-backdrop",
          sourcePath,
          subjectType: "character",
          fixtureSet: "fresh-natural-canary",
          contract: tinyContract(),
        },
      ],
    }));
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "api-lane-01__otis-winter-layered-working",
      attempt: 1,
      capturedFile: sourcePath,
      qualityWarnings: ["source-missing-alpha"],
      metadata: {
        width: 160,
        height: 240,
        format: "jpeg",
        hasAlpha: false,
      },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "otis-canary-no-alpha",
      assetType: "character",
      name: "Otis",
      planRoot,
      inboxRoot: join(root, "inbox"),
      sourceRequirements: {},
      firewall: {
        planRole: "canary",
        requiresCanary: false,
        canaryGatePath: gatePath,
        promptContractHash: "prompt",
        referenceContractHash: "reference",
        sourceContractHash: "source",
      },
      slots: [
        {
          slotId: "api-lane-01__otis-winter-layered-working",
          baseSlotId: "otis-winter-layered-working",
          inboxDirectory,
          expectedInboxFile: sourcePath,
          cutout: tinyContract(),
        },
      ],
    }));

    const benchmarkOutput = execFileSync(tsx, [
      adapterScript,
      "cutout-benchmark",
      "--fixture-set",
      fixtureSetPath,
      "--model-selection",
      selectionPath,
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const cutoutOutput = execFileSync(tsx, [
      adapterScript,
      "cutout-auto",
      "--plan",
      planPath,
      "--model-selection",
      selectionPath,
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const doctorOutput = execFileSync(tsx, [
      adapterScript,
      "cutout-doctor",
      "--plan",
      planPath,
      "--strict",
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const assetDoctorOutput = execFileSync(tsx, [
      adapterScript,
      "doctor",
      "--plan",
      planPath,
      "--strict",
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const verifyOutput = execFileSync(tsx, [
      adapterScript,
      "verify-canary",
      "--plan",
      planPath,
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const receipt = JSON.parse(readFileSync(join(inboxDirectory, "cutout-receipt.json"), "utf8")) as {
      status: string;
      outputPath: string;
      selectedModel: { candidateId: string };
      sourceSaliencyBounds: unknown;
      masteredPngPath: string;
      derivedPreviewPath: string;
      reviewPreviewPath: string;
      characterPipeline?: {
        mode: string;
        runJsonPath: string;
        canaryOnly: boolean;
        notProductionCompletion: boolean;
        slotExpansionStrategy: string;
      };
      qa: { status: string; badges: Record<string, string> };
    };
    const outputMetadata = await sharp(receipt.outputPath).metadata();
    const alpha = await sharp(receipt.outputPath).ensureAlpha().extractChannel("alpha").raw().toBuffer();
    const alphaAt = (x: number, y: number) => alpha[(y * 160) + x] ?? 0;

    expect(benchmarkOutput).toContain("Cutout model selection: ready");
    expect(cutoutOutput).toContain("Cutout auto: passed");
    expect(doctorOutput).toContain("Cutout doctor: passed");
    expect(assetDoctorOutput).toContain("Asset doctor: passed");
    expect(verifyOutput).toContain("Canary gate: passed");
    expect(receipt.status).toBe("passed");
    expect(receipt.selectedModel.candidateId).toBe("simple-character-cutout");
    expect(receipt.sourceSaliencyBounds).toBeTruthy();
    expect(receipt.qa.status).toBe("passed");
    expect(receipt.qa.badges.alpha).toBe("passed");
    expect(outputMetadata.hasAlpha).toBe(true);
    expect(alphaAt(80, 120)).toBeGreaterThan(220);
    expect(alphaAt(8, 8)).toBe(0);
    expect(existsSync(fromRoot(receipt.masteredPngPath))).toBe(true);
    expect(existsSync(fromRoot(receipt.derivedPreviewPath))).toBe(true);
    expect(existsSync(fromRoot(receipt.reviewPreviewPath))).toBe(true);
    expect(receipt.characterPipeline?.mode).toBe("art-master-derive-review");
    expect(receipt.characterPipeline?.canaryOnly).toBe(true);
    expect(receipt.characterPipeline?.notProductionCompletion).toBe(true);
    expect(receipt.characterPipeline?.slotExpansionStrategy).toContain("single cutout");
    expect(receipt.characterPipeline?.runJsonPath).toContain(".artlab/runs/otis/");
    expect(receipt.masteredPngPath).toContain(".artlab/characters/otis/masters/");
    expect(receipt.derivedPreviewPath).toContain(".artlab/characters/otis/staged-public/");
    expect(receipt.reviewPreviewPath.endsWith("final-upload-ready-board.html")).toBe(true);
    expect(readFileSync(fromRoot(receipt.reviewPreviewPath), "utf8")).toContain("CANARY ONLY");
  }, 30000);
});
