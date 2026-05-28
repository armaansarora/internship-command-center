import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { REQUIRED_PROMOTION_PHRASE, type RequiredPromotionPhrase } from "./constants";

export type CreativePromotionPhase =
  | "final-board-ready"
  | "integration-briefing"
  | "app-preview-ready"
  | "approved-for-app"
  | "promoted"
  | "integrated"
  | string;

export type CreativePromotionBlocker =
  | "approval-phrase-missing"
  | "public-art-writes-not-unlocked"
  | "strict-qa-missing"
  | "final-board-manifest-missing"
  | "final-board-manifest-promotes-directly"
  | "app-preview-manifest-missing"
  | "app-preview-manifest-promotes-directly"
  | "staged-asset-missing";

export interface CreativePromotionActionManifestSummary {
  exists: boolean;
  promotesOnAction: boolean;
  localImagePaths: readonly string[];
}

export interface CreativePromotionStagedAsset {
  slotId: string;
  sourcePath: string;
  targetRelativePath: string;
}

export interface CreativePromotionFirewallInput {
  runId: string;
  currentPhase: CreativePromotionPhase;
  approvalPhrase: string;
  publicArtWritesAllowed: boolean;
  strictQaPassed: boolean;
  finalBoardActionManifest: CreativePromotionActionManifestSummary;
  appPreviewActionManifest: CreativePromotionActionManifestSummary;
  stagedAssets: readonly CreativePromotionStagedAsset[];
}

export interface CreativePromotionFirewallResult {
  allowed: boolean;
  blockers: CreativePromotionBlocker[];
}

export interface CreativePromotionReceipt {
  schemaVersion: "tower-creative-promotion-receipt-v1";
  runId: string;
  approvalPhrase: RequiredPromotionPhrase;
  promotedAt: string;
  promotedAssets: Array<{
    slotId: string;
    sourcePath: string;
    targetRelativePath: string;
  }>;
}

export interface CreativeTransactionalPromotionInput extends CreativePromotionFirewallInput {
  publicArtRoot: string;
  manifestPath: string;
  receiptPath: string;
  now?: Date;
}

export interface CreativeTransactionalPromotionResult {
  status: "promoted";
  receipt: CreativePromotionReceipt;
  promotedPaths: string[];
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function evaluateCreativePromotionFirewall(
  input: CreativePromotionFirewallInput,
): CreativePromotionFirewallResult {
  const blockers: CreativePromotionBlocker[] = [];

  if (input.approvalPhrase !== REQUIRED_PROMOTION_PHRASE) {
    blockers.push("approval-phrase-missing");
  }

  if (!input.publicArtWritesAllowed) {
    blockers.push("public-art-writes-not-unlocked");
  }

  if (!input.strictQaPassed) {
    blockers.push("strict-qa-missing");
  }

  if (!input.finalBoardActionManifest.exists) {
    blockers.push("final-board-manifest-missing");
  }

  if (input.finalBoardActionManifest.promotesOnAction) {
    blockers.push("final-board-manifest-promotes-directly");
  }

  if (!input.appPreviewActionManifest.exists) {
    blockers.push("app-preview-manifest-missing");
  }

  if (input.appPreviewActionManifest.promotesOnAction) {
    blockers.push("app-preview-manifest-promotes-directly");
  }

  if (input.stagedAssets.some((asset) => !existsSync(asset.sourcePath))) {
    blockers.push("staged-asset-missing");
  }

  return {
    allowed: blockers.length === 0,
    blockers: unique(blockers),
  };
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;

  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tempPath, path);
}

async function readManifest(path: string): Promise<Array<Record<string, unknown>>> {
  const raw = await readFile(path, "utf8").catch(() => "[]");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Promotion manifest must be a JSON array.");
  }

  return parsed as Array<Record<string, unknown>>;
}

export async function promoteCreativeAssetsTransactionally(
  input: CreativeTransactionalPromotionInput,
): Promise<CreativeTransactionalPromotionResult> {
  const firewall = evaluateCreativePromotionFirewall(input);

  if (!firewall.allowed) {
    throw new Error(`Promotion blocked: ${firewall.blockers.join(", ")}`);
  }

  const promotedPaths: string[] = [];

  for (const asset of input.stagedAssets) {
    const targetPath = join(input.publicArtRoot, asset.targetRelativePath);

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(asset.sourcePath, targetPath);
    promotedPaths.push(targetPath);
  }

  const existingManifest = await readManifest(input.manifestPath);
  const promotedSlotIds = new Set(input.stagedAssets.map((asset) => asset.slotId));
  const nextManifest = [
    ...existingManifest.filter((entry) => !promotedSlotIds.has(String(entry.slotId ?? ""))),
    ...input.stagedAssets.map((asset) => ({
      slotId: asset.slotId,
      src: `/art/${asset.targetRelativePath.replaceAll("\\", "/")}`,
      sourcePath: asset.sourcePath,
      runId: input.runId,
    })),
  ];
  const receipt: CreativePromotionReceipt = {
    schemaVersion: "tower-creative-promotion-receipt-v1",
    runId: input.runId,
    approvalPhrase: REQUIRED_PROMOTION_PHRASE,
    promotedAt: (input.now ?? new Date()).toISOString(),
    promotedAssets: input.stagedAssets.map((asset) => ({
      slotId: asset.slotId,
      sourcePath: asset.sourcePath,
      targetRelativePath: asset.targetRelativePath,
    })),
  };

  await writeJsonAtomic(input.manifestPath, nextManifest);
  await writeJsonAtomic(input.receiptPath, receipt);

  return {
    status: "promoted",
    receipt,
    promotedPaths,
  };
}
