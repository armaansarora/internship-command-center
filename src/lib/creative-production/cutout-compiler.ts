import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import type { CreativeAssetType } from "./types";

export const BANNED_PRODUCTION_CUTOUT_TERMS = [
  "#00ff00",
  "chroma",
  "green matte",
  "extract-alpha",
] as const;

export const PREMIUM_SIMPLE_BACKDROP_CONTRACT = [
  "Use a premium simple backdrop with high subject/background separation.",
  "Use no patterned walls.",
  "Use no furniture or objects overlapping the body, hair, hands, feet, or held props.",
  "Avoid same-color collisions between clothing, props, and background.",
  "Use no cast or contact shadows touching or merging with the subject.",
  "Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.",
] as const;

export type CutoutSubjectType =
  | "character"
  | "hair-beard-character"
  | "prop"
  | "ui-object"
  | "hard-surface-icon"
  | "foreground-layer";

export type CutoutTopologyType =
  | "standard-character"
  | "hair-beard-soft-body-held-props"
  | "held-prop"
  | "ui-object"
  | "hard-surface-icon"
  | "foreground-layer";

export type CutoutFailureCode =
  | "cutout-model-missing"
  | "bootstrap-failed"
  | "license-blocked"
  | "low-confidence-mask"
  | "subject-cropped"
  | "prop-lost"
  | "edge-halo"
  | "background-remnant"
  | "alpha-holes"
  | "extra-islands"
  | "stale-receipt"
  | "app-shadow-mismatch"
  | "source-dimensions-below-contract";

export interface CutoutPaddingThresholds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CutoutThresholds {
  minimumLongEdge: number;
  minimumShortEdge: number;
  borderSamplePixels: number;
  borderAlphaThreshold: number;
  minimumPadding: CutoutPaddingThresholds;
  maxTinyIslands: number;
  maxTinyIslandCanvasRatio: number;
  maxTotalIslandCanvasRatio: number;
  maxHoleSubjectRatio: number;
  maxTotalHoleSubjectRatio: number;
  allowInteriorNegativeSpace?: boolean;
  allowMultipleForegroundComponents?: boolean;
  haloMeanAlphaMax: number;
  haloP99AlphaMax: number;
  maxBackdropRemnantEdgeRatio: number;
  minimumForegroundMeanConfidence: number;
  minimumForegroundP5Confidence: number;
  maximumBackgroundP95Confidence: number;
}

export interface CutoutContract {
  required: boolean;
  subjectType: CutoutSubjectType;
  topologyType: CutoutTopologyType;
  expectedProps: string[];
  backdropContract: "premium-simple-backdrop-v1";
  backdropRequirements: readonly string[];
  shadowPolicy: "app-owned";
  thresholds: CutoutThresholds;
  review: {
    showOriginalSource: true;
    showCheckerboardCutout: true;
    showDarkPreview: true;
    showLightPreview: true;
    showTowerShadowPreview: true;
    badges: readonly ["cutout", "alpha", "dimensions", "crop", "halo", "props"];
  };
}

export const CHARACTER_CUTOUT_THRESHOLDS: CutoutThresholds = {
  minimumLongEdge: 4096,
  minimumShortEdge: 2300,
  borderSamplePixels: 8,
  borderAlphaThreshold: 32,
  minimumPadding: {
    top: 0.05,
    right: 0.06,
    bottom: 0.04,
    left: 0.06,
  },
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

const PROP_CUTOUT_THRESHOLDS: CutoutThresholds = {
  ...CHARACTER_CUTOUT_THRESHOLDS,
  minimumLongEdge: 2048,
  minimumShortEdge: 1024,
  minimumPadding: {
    top: 0.04,
    right: 0.04,
    bottom: 0.04,
    left: 0.04,
  },
};

function defaultSubjectForAssetType(assetType: CreativeAssetType): CutoutSubjectType {
  if (assetType === "character") return "character";
  if (assetType === "prop") return "prop";
  if (assetType === "ui-texture") return "ui-object";
  if (assetType === "icon-system") return "hard-surface-icon";

  return "foreground-layer";
}

function defaultTopology(input: {
  assetType: CreativeAssetType;
  name?: string;
  slotId: string;
  outfit?: string;
  pose?: string;
}): CutoutTopologyType {
  if (input.assetType !== "character") {
    if (input.assetType === "prop") return "held-prop";
    if (input.assetType === "ui-texture") return "ui-object";
    if (input.assetType === "icon-system") return "hard-surface-icon";
    return "foreground-layer";
  }

  const text = `${input.name ?? ""} ${input.slotId} ${input.outfit ?? ""} ${input.pose ?? ""}`.toLowerCase();

  if (
    /otis|beard|hair|winter|layer|working|greeting|alert|key|badge|prop/.test(text)
  ) {
    return "hair-beard-soft-body-held-props";
  }

  return "standard-character";
}

function defaultExpectedProps(input: {
  assetType: CreativeAssetType;
  name?: string;
  slotId: string;
  pose?: string;
}): string[] {
  if (input.assetType !== "character") return [];

  const text = `${input.name ?? ""} ${input.slotId} ${input.pose ?? ""}`.toLowerCase();
  const props: string[] = [];

  if (/otis|badge/.test(text)) props.push("badge");
  if (/otis|key/.test(text)) props.push("keys");
  if (/working|greeting|listening|alert|prop/.test(text)) props.push("held prop");

  return Array.from(new Set(props));
}

export function createDefaultCutoutContract(input: {
  assetType: CreativeAssetType;
  name?: string;
  slotId: string;
  outfit?: string;
  pose?: string;
  expectedProps?: string[];
  thresholds?: Partial<CutoutThresholds> & { minimumPadding?: Partial<CutoutPaddingThresholds> };
}): CutoutContract {
  const topologyType = defaultTopology(input);
  const subjectType = topologyType === "hair-beard-soft-body-held-props"
    ? "hair-beard-character"
    : defaultSubjectForAssetType(input.assetType);
  const baseThresholds =
    input.assetType === "prop" || input.assetType === "ui-texture" || input.assetType === "icon-system"
      ? PROP_CUTOUT_THRESHOLDS
      : CHARACTER_CUTOUT_THRESHOLDS;

  return {
    required: input.assetType !== "environment" && input.assetType !== "marketing-hero" && input.assetType !== "scene",
    subjectType,
    topologyType,
    expectedProps: input.expectedProps ?? defaultExpectedProps(input),
    backdropContract: "premium-simple-backdrop-v1",
    backdropRequirements: PREMIUM_SIMPLE_BACKDROP_CONTRACT,
    shadowPolicy: "app-owned",
    thresholds: {
      ...baseThresholds,
      ...input.thresholds,
      allowInteriorNegativeSpace:
        input.thresholds?.allowInteriorNegativeSpace ?? topologyType === "hair-beard-soft-body-held-props",
      allowMultipleForegroundComponents: input.thresholds?.allowMultipleForegroundComponents ?? false,
      minimumPadding: {
        ...baseThresholds.minimumPadding,
        ...input.thresholds?.minimumPadding,
      },
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

export interface CutoutModelCandidate {
  id: string;
  adapter: "rembg" | "local-alpha-pass-through" | "simple-backdrop-segmentation" | "custom-local";
  packageName: string;
  packageVersion: string;
  packageLicense: string;
  modelName: string;
  modelVersion: string;
  modelWeightSourceUrl: string;
  modelWeightLicense: string;
  modelWeightSha256: string;
  cachedModelPath: string;
  supports: Array<{
    subjectType: CutoutSubjectType;
    topologyType?: CutoutTopologyType;
  }>;
}

export interface CutoutFixtureScore {
  candidateId: string;
  subjectType: CutoutSubjectType;
  topologyType?: CutoutTopologyType;
  fixtureSet: "synthetic" | "old-gemini-regression" | "fresh-natural-canary";
  score: number;
}

export interface CutoutModelSelection {
  schemaVersion: "tower-cutout-model-selection-v1";
  status: "ready" | "blocked";
  winners: Partial<Record<CutoutSubjectType, {
    candidateId: string;
    modelName: string;
    modelVersion: string;
    score: number;
  }>>;
  blocked: Array<{
    candidateId: string;
    reason: string;
  }>;
  missingSubjectTypes: CutoutSubjectType[];
}

function sha256FileSync(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function candidateLicenseBlocker(candidate: CutoutModelCandidate, options: { verifyCachedFiles?: boolean } = {}): string | undefined {
  if (!candidate.packageLicense.trim()) return "missing package license";
  if (!candidate.modelWeightLicense.trim()) return "missing model weight license";
  if (/requires[- ]project[- ]license[- ]review|license[- ]blocked|unclear|unknown|todo|pending/i.test(candidate.modelWeightLicense)) {
    return "model weight license is still pending review";
  }
  if (!candidate.modelWeightSourceUrl.trim()) return "missing model weight source URL";
  if (!candidate.modelWeightSha256.trim()) return "missing model weight hash";
  if (!candidate.cachedModelPath.trim()) return "missing cached model path";
  if (options.verifyCachedFiles) {
    if (!existsSync(candidate.cachedModelPath)) return "missing cached model file";

    const actualHash = sha256FileSync(candidate.cachedModelPath);

    if (actualHash !== candidate.modelWeightSha256) {
      return `cached model hash mismatch: expected ${candidate.modelWeightSha256}, got ${actualHash}`;
    }
  }

  return undefined;
}

export function selectCutoutModelWinners(input: {
  candidates: CutoutModelCandidate[];
  fixtureScores: CutoutFixtureScore[];
  requiredSubjectTypes: CutoutSubjectType[];
  minimumScore?: number;
  verifyCachedFiles?: boolean;
}): CutoutModelSelection {
  const blocked: CutoutModelSelection["blocked"] = [];
  const minimumScore = input.minimumScore ?? 0.9;
  const candidatesById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const eligibleCandidates = input.candidates.filter((candidate) => {
    const blocker = candidateLicenseBlocker(candidate, { verifyCachedFiles: input.verifyCachedFiles });

    if (blocker) {
      blocked.push({ candidateId: candidate.id, reason: blocker });
      return false;
    }

    return true;
  });
  const winners: CutoutModelSelection["winners"] = {};
  const missingSubjectTypes: CutoutSubjectType[] = [];

  for (const subjectType of input.requiredSubjectTypes) {
    const groupedScores = new Map<string, {
      candidate: CutoutModelCandidate;
      weightedScore: number;
      totalWeight: number;
    }>();

    for (const score of input.fixtureScores.filter((entry) => entry.subjectType === subjectType)) {
      const candidate = candidatesById.get(score.candidateId);

      if (!candidate) continue;

      const weight = score.fixtureSet === "fresh-natural-canary"
        ? 0.6
        : score.fixtureSet === "synthetic"
          ? 0.25
          : 0.15;
      const existing = groupedScores.get(candidate.id) ?? {
        candidate,
        weightedScore: 0,
        totalWeight: 0,
      };

      existing.weightedScore += score.score * weight;
      existing.totalWeight += weight;
      groupedScores.set(candidate.id, existing);
    }

    const scored = Array.from(groupedScores.values())
      .map((entry) => ({
        candidate: entry.candidate,
        score: entry.totalWeight > 0 ? entry.weightedScore / entry.totalWeight : 0,
      }))
      .filter((entry) =>
        eligibleCandidates.includes(entry.candidate) &&
        entry.candidate.supports.some((support) => support.subjectType === subjectType),
      )
      .sort((left, right) => right.score - left.score);
    const winner = scored[0];

    if (!winner || winner.score < minimumScore) {
	      missingSubjectTypes.push(subjectType);
	      continue;
	    }

    winners[subjectType] = {
      candidateId: winner.candidate.id,
      modelName: winner.candidate.modelName,
      modelVersion: winner.candidate.modelVersion,
      score: Number(winner.score.toFixed(4)),
    };
  }

  return {
    schemaVersion: "tower-cutout-model-selection-v1",
    status: missingSubjectTypes.length || blocked.length ? "blocked" : "ready",
    winners,
    blocked,
    missingSubjectTypes,
  };
}

interface Component {
  pixels: number[];
  count: number;
  bbox: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

function indexToPoint(index: number, width: number): { x: number; y: number } {
  return {
    x: index % width,
    y: Math.floor(index / width),
  };
}

function findComponents(input: {
  alpha: Uint8Array;
  width: number;
  height: number;
  predicate: (alpha: number, index: number) => boolean;
}): Component[] {
  const visited = new Uint8Array(input.alpha.length);
  const components: Component[] = [];
  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  for (let index = 0; index < input.alpha.length; index += 1) {
    if (visited[index] || !input.predicate(input.alpha[index]!, index)) continue;

    const stack = [index];
    const pixels: number[] = [];
    const start = indexToPoint(index, input.width);
    const bbox = {
      left: start.x,
      right: start.x,
      top: start.y,
      bottom: start.y,
    };

    visited[index] = 1;

    while (stack.length) {
      const current = stack.pop()!;
      const { x, y } = indexToPoint(current, input.width);

      pixels.push(current);
      bbox.left = Math.min(bbox.left, x);
      bbox.right = Math.max(bbox.right, x);
      bbox.top = Math.min(bbox.top, y);
      bbox.bottom = Math.max(bbox.bottom, y);

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || ny < 0 || nx >= input.width || ny >= input.height) continue;

        const neighbor = (ny * input.width) + nx;

        if (visited[neighbor] || !input.predicate(input.alpha[neighbor]!, neighbor)) continue;

        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    components.push({ pixels, count: pixels.length, bbox });
  }

  return components.sort((left, right) => right.count - left.count);
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));

  return sorted[index] ?? 0;
}

export interface CutoutAlphaReport {
  schemaVersion: "tower-cutout-alpha-qa-v1";
  status: "passed" | "failed";
  imagePath: string;
  width: number;
  height: number;
  failures: CutoutFailureCode[];
  badges: Record<"cutout" | "alpha" | "dimensions" | "crop" | "halo" | "props", "passed" | "failed">;
  metrics: {
    borderOpaquePixels: number;
    subjectPixels: number;
    tinyIslandCount: number;
    totalIslandPixels: number;
    holePixels: number;
    haloMeanAlpha: number;
    haloP99Alpha: number;
    padding: CutoutPaddingThresholds;
  };
}

export async function evaluateCutoutAlpha(input: {
  imagePath: string;
  thresholds: CutoutThresholds;
  expectedProps?: string[];
  sourceSaliencyBounds?: { left: number; top: number; right: number; bottom: number };
  sourceSaliencyPixels?: number;
}): Promise<CutoutAlphaReport> {
  const { data, info } = await sharp(input.imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const alpha = new Uint8Array(pixelCount);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    alpha[pixel] = data[(pixel * 4) + 3] ?? 0;
  }

  const failures = new Set<CutoutFailureCode>();
  const longEdge = Math.max(info.width, info.height);
  const shortEdge = Math.min(info.width, info.height);

  if (longEdge < input.thresholds.minimumLongEdge || shortEdge < input.thresholds.minimumShortEdge) {
    failures.add("source-dimensions-below-contract");
  }

  let borderOpaquePixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const inBorder = x < input.thresholds.borderSamplePixels ||
        y < input.thresholds.borderSamplePixels ||
        x >= info.width - input.thresholds.borderSamplePixels ||
        y >= info.height - input.thresholds.borderSamplePixels;

      if (!inBorder) continue;

      if (alpha[(y * info.width) + x]! >= input.thresholds.borderAlphaThreshold) {
        borderOpaquePixels += 1;
      }
    }
  }

  if (borderOpaquePixels > 0) failures.add("subject-cropped");

	  const components = findComponents({
	    alpha,
	    width: info.width,
	    height: info.height,
	    predicate: (value) => value >= input.thresholds.borderAlphaThreshold,
	  });
	  const main = components[0];
	  const subjectComponents = input.thresholds.allowMultipleForegroundComponents
	    ? components.filter((component) => component.count / pixelCount > input.thresholds.maxTinyIslandCanvasRatio)
	    : main
	      ? [main]
	      : [];
	  const subjectComponentSet = new Set(subjectComponents);
	  const islands = input.thresholds.allowMultipleForegroundComponents
	    ? components.filter((component) => !subjectComponentSet.has(component))
	    : components.slice(1);
	  const totalIslandPixels = islands.reduce((sum, component) => sum + component.count, 0);
	  const tinyIslandCount = islands.filter((component) =>
	    component.count / pixelCount <= input.thresholds.maxTinyIslandCanvasRatio,
	  ).length;

  if (
    islands.length > input.thresholds.maxTinyIslands ||
    totalIslandPixels / pixelCount > input.thresholds.maxTotalIslandCanvasRatio ||
    tinyIslandCount > input.thresholds.maxTinyIslands
  ) {
    failures.add("extra-islands");
  }

	  let padding: CutoutPaddingThresholds = { top: 1, right: 1, bottom: 1, left: 1 };
	  const mainPixelSet = new Set(subjectComponents.flatMap((component) => component.pixels));
	  const subjectBbox = subjectComponents.length
	    ? subjectComponents.reduce((bbox, component) => ({
	        left: Math.min(bbox.left, component.bbox.left),
	        right: Math.max(bbox.right, component.bbox.right),
	        top: Math.min(bbox.top, component.bbox.top),
	        bottom: Math.max(bbox.bottom, component.bbox.bottom),
	      }), { ...subjectComponents[0]!.bbox })
	    : undefined;
	  const subjectPixelsFromComponents = subjectComponents.reduce((sum, component) => sum + component.count, 0);

	  if (subjectBbox) {
	    padding = {
	      top: subjectBbox.top / info.height,
	      right: (info.width - 1 - subjectBbox.right) / info.width,
	      bottom: (info.height - 1 - subjectBbox.bottom) / info.height,
	      left: subjectBbox.left / info.width,
	    };

    if (
      padding.top < input.thresholds.minimumPadding.top ||
      padding.right < input.thresholds.minimumPadding.right ||
      padding.bottom < input.thresholds.minimumPadding.bottom ||
      padding.left < input.thresholds.minimumPadding.left
    ) {
      failures.add("subject-cropped");
    }

    if (input.expectedProps?.length && input.sourceSaliencyBounds) {
      const sourceArea =
        (input.sourceSaliencyBounds.right - input.sourceSaliencyBounds.left + 1) *
        (input.sourceSaliencyBounds.bottom - input.sourceSaliencyBounds.top + 1);
      const cutoutArea = (subjectBbox.right - subjectBbox.left + 1) * (subjectBbox.bottom - subjectBbox.top + 1);
      const bboxRetention = sourceArea > 0 ? cutoutArea / sourceArea : 1;
      const pixelRetention = input.sourceSaliencyPixels && input.sourceSaliencyPixels > 0
        ? subjectPixelsFromComponents / input.sourceSaliencyPixels
        : undefined;

      if (
        pixelRetention === undefined
          ? bboxRetention < 0.85
          : bboxRetention < 0.85 && pixelRetention < 0.78
      ) {
        failures.add("prop-lost");
      }
    }
  } else {
    failures.add("low-confidence-mask");
  }

  const inverted = new Uint8Array(pixelCount);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    inverted[pixel] = alpha[pixel]! < input.thresholds.borderAlphaThreshold ? 255 : 0;
  }

  const transparentComponents = findComponents({
    alpha: inverted,
    width: info.width,
    height: info.height,
    predicate: (value) => value > 0,
  });
  const holes = transparentComponents.filter((component) =>
    component.bbox.left > 0 &&
    component.bbox.top > 0 &&
    component.bbox.right < info.width - 1 &&
    component.bbox.bottom < info.height - 1,
  );
	  const holePixels = holes.reduce((sum, component) => sum + component.count, 0);
	  const subjectPixels = subjectPixelsFromComponents;

	  if (
	    subjectPixels > 0 &&
	    !input.thresholds.allowInteriorNegativeSpace &&
	    (holes.some((component) => component.count / subjectPixels > input.thresholds.maxHoleSubjectRatio) ||
	      holePixels / subjectPixels > input.thresholds.maxTotalHoleSubjectRatio)
	  ) {
	    failures.add("alpha-holes");
	  }

  const backgroundAlphaValues: number[] = [];

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (!mainPixelSet.has(pixel) && alpha[pixel]! > 0) {
      backgroundAlphaValues.push(alpha[pixel]!);
    }
  }

  const haloMeanAlpha = backgroundAlphaValues.length
    ? backgroundAlphaValues.reduce((sum, value) => sum + value, 0) / backgroundAlphaValues.length
    : 0;
  const haloP99Alpha = percentile(backgroundAlphaValues, 99);
  const backdropRemnantRatio = backgroundAlphaValues.length / pixelCount;

  if (
    haloMeanAlpha > input.thresholds.haloMeanAlphaMax ||
    haloP99Alpha > input.thresholds.haloP99AlphaMax ||
    backdropRemnantRatio > input.thresholds.maxBackdropRemnantEdgeRatio
  ) {
    failures.add("edge-halo");
  }

  const failuresList = Array.from(failures);
  const failed = failuresList.length > 0;

  return {
    schemaVersion: "tower-cutout-alpha-qa-v1",
    status: failed ? "failed" : "passed",
    imagePath: input.imagePath,
    width: info.width,
    height: info.height,
    failures: failuresList,
    badges: {
      cutout: failed ? "failed" : "passed",
      alpha: failures.has("alpha-holes") || failures.has("extra-islands") ? "failed" : "passed",
      dimensions: failures.has("source-dimensions-below-contract") ? "failed" : "passed",
      crop: failures.has("subject-cropped") ? "failed" : "passed",
      halo: failures.has("edge-halo") ? "failed" : "passed",
      props: failures.has("prop-lost") ? "failed" : "passed",
    },
    metrics: {
      borderOpaquePixels,
      subjectPixels,
      tinyIslandCount,
      totalIslandPixels,
      holePixels,
      haloMeanAlpha,
      haloP99Alpha,
      padding,
    },
  };
}

export function buildCutoutReadinessScore(input: {
  backdropSeparation: number;
  sourceFraming: number;
  subjectComplexityFit: number;
  modelBenchmark: number;
  canaryCutout: number;
  threshold?: number;
}): {
  schemaVersion: "tower-cutout-readiness-score-v1";
  status: "ready" | "blocked";
  score: number;
  threshold: number;
  reasons: string[];
} {
  const threshold = input.threshold ?? 0.9;
  const score = (
    (input.backdropSeparation * 0.22) +
    (input.sourceFraming * 0.18) +
    (input.subjectComplexityFit * 0.18) +
    (input.modelBenchmark * 0.2) +
    (input.canaryCutout * 0.22)
  );
  const reasons = [
    input.backdropSeparation < threshold ? "backdrop-separation-below-threshold" : "",
    input.sourceFraming < threshold ? "source-framing-below-threshold" : "",
    input.subjectComplexityFit < threshold ? "subject-complexity-fit-below-threshold" : "",
    input.modelBenchmark < threshold ? "model-benchmark-below-threshold" : "",
    input.canaryCutout < threshold ? "canary-cutout-below-threshold" : "",
    score < threshold ? "cutout-readiness-score-below-threshold" : "",
  ].filter(Boolean);

  return {
    schemaVersion: "tower-cutout-readiness-score-v1",
    status: reasons.length ? "blocked" : "ready",
    score: Number(score.toFixed(4)),
    threshold,
    reasons,
  };
}

export function containsBannedProductionCutoutLanguage(text: string): boolean {
  const normalized = text.toLowerCase();

  return BANNED_PRODUCTION_CUTOUT_TERMS.some((term) => normalized.includes(term.toLowerCase()));
}
