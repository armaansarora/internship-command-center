import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createCreativeBudgetLedger } from "./budget";
import {
  applyCreativeHumanResponse,
  buildFinalBoardForCreativeRun,
  startCreativeProductionRun,
} from "./operator/v1-final";
import { buildAppPreviewForCreativeRun, startWebsiteIntegrationBriefingForCreativeRun } from "./operator/app-preview";
import { promoteCreativeAssetsTransactionally } from "./promotion";
import { createLocalMockProviderAdapter } from "./providers";
import {
  runCreativeSlotScheduler,
  type CreativeSchedulerProgressSnapshot,
  type CreativeSchedulerSlot,
} from "./scheduler";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slot(slotId: string): CreativeSchedulerSlot {
  return {
    slotId,
    providerId: "local-mock",
    prompt: `Generate ${slotId}.`,
    sourceHash: `${slotId}-prompt-hash`,
  };
}

describe("dream creative production pipeline", () => {
  it("proves a mocked character vertical slice from vague request through gated temp promotion", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-dream-cpe-"));
    const stateRoot = join(root, "studio");
    const providerIntervals: Array<{ slotId: string; start: number; end: number }> = [];
    const snapshots: CreativeSchedulerProgressSnapshot[] = [];
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "let's make Mara",
      runId: "mara-dream-v1",
      now: new Date("2026-05-19T15:00:00.000Z"),
    });

    expect(run.state.phase).toBe("awaiting-initial-approval");
    expect(run.humanAction.recommendedResponse).toBe("approve direction");

    const approvedDirection = await applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "approve direction",
      now: new Date("2026-05-19T15:01:00.000Z"),
    });

    expect(approvedDirection.phase).toBe("initial-direction-approved");
    expect(approvedDirection.publicArtWritesAllowed).toBe(false);

    const schedule = await runCreativeSlotScheduler({
      runId: "mara-dream-v1",
      slots: ["mara-idle", "mara-greeting", "mara-working"].map(slot),
      provider: createLocalMockProviderAdapter({
        costCents: 2,
        maxConcurrency: 3,
        generateSlot: async (request) => {
          const start = Date.now();
          await delay(request.slotId === "mara-idle" ? 10 : 45);
          const end = Date.now();
          providerIntervals.push({ slotId: request.slotId, start, end });
          return {
            status: "clean",
            actualCostCents: 2,
            outputHash: `${request.slotId}-source-hash`,
            responseMetadata: { provider: "local-mock" },
          };
        },
      }),
      budgetLedger: createCreativeBudgetLedger({
        runId: "mara-dream-v1",
        approvedBudgetCents: 50,
      }),
      policy: {
        perRunMaxConcurrency: 3,
        perProviderMaxConcurrency: { "local-mock": 3 },
        localStageMaxConcurrency: 2,
        slotLeaseTimeoutMs: 5_000,
      },
      processLocalOutput: async ({ slot }) => {
        await delay(10);
        return { status: "clean", outputHash: `${slot.slotId}-cutout-hash` };
      },
      onProgress: (snapshot) => snapshots.push(snapshot),
    });

    expect(schedule.status).toBe("completed");
    expect(schedule.budgetLedger.totals.spentCents).toBe(6);
    expect(providerIntervals[0]!.start).toBeLessThan(providerIntervals[1]!.end);
    expect(snapshots.some((snapshot) =>
      snapshot.runningLocalSlots.length > 0 && snapshot.runningProviderSlots.length > 0,
    )).toBe(true);

    const resume = await runCreativeSlotScheduler({
      runId: "mara-dream-v1",
      slots: ["mara-idle", "mara-greeting", "mara-working"].map(slot),
      provider: createLocalMockProviderAdapter({
        costCents: 2,
        generateSlot: async () => {
          throw new Error("resume should skip clean receipts");
        },
      }),
      budgetLedger: schedule.budgetLedger,
      policy: {
        perRunMaxConcurrency: 3,
        perProviderMaxConcurrency: { "local-mock": 3 },
        localStageMaxConcurrency: 2,
        slotLeaseTimeoutMs: 5_000,
      },
    });

    expect(resume.status).toBe("completed");
    expect(resume.budgetLedger.totals.spentCents).toBe(6);

    const finalImagePath = join(root, "images", "mara-idle.png");
    const assetDoctorPath = join(run.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");

    mkdirSync(join(root, "images"), { recursive: true });
    mkdirSync(join(assetDoctorPath, ".."), { recursive: true });
    await sharp({
      create: {
        width: 128,
        height: 192,
        channels: 4,
        background: "#c9a84c",
      },
    }).png().toFile(finalImagePath);
    writeFileSync(join(run.runRoot, "run-state.json"), `${JSON.stringify({
      ...approvedDirection,
      phase: "strict-qa",
    }, null, 2)}\n`);
    writeFileSync(assetDoctorPath, JSON.stringify({
      status: "passed",
      strict: true,
      checkedGeneratedImages: [{
        slotId: "mara-idle",
        path: finalImagePath,
        latestReceiptPath: join(root, "receipts", "mara-idle.json"),
        latestReceiptWarnings: [],
      }],
    }, null, 2));

    const finalBoard = await buildFinalBoardForCreativeRun({ runRoot: run.runRoot });

    expect(finalBoard.state.phase).toBe("final-board-ready");
    expect(finalBoard.actionManifestPath).toContain("action-manifest.json");

    await startWebsiteIntegrationBriefingForCreativeRun({ runRoot: run.runRoot });
    const appPreview = await buildAppPreviewForCreativeRun({ runRoot: run.runRoot });

    expect(appPreview.state.phase).toBe("app-preview-ready");
    await expect(promoteCreativeAssetsTransactionally({
      runId: "mara-dream-v1",
      currentPhase: "app-preview-ready",
      approvalPhrase: "looks good",
      publicArtWritesAllowed: false,
      strictQaPassed: true,
      finalBoardActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [finalImagePath],
      },
      appPreviewActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [finalImagePath],
      },
      stagedAssets: [{
        slotId: "mara-idle",
        sourcePath: finalImagePath,
        targetRelativePath: "lobby/mara/regular/idle.webp",
      }],
      publicArtRoot: join(root, "public-art"),
      manifestPath: join(root, "manifest.json"),
      receiptPath: join(root, "promotion-receipt.json"),
    })).rejects.toThrow("approval-phrase-missing");

    const promoted = await promoteCreativeAssetsTransactionally({
      runId: "mara-dream-v1",
      currentPhase: "app-preview-ready",
      approvalPhrase: "approved for app",
      publicArtWritesAllowed: true,
      strictQaPassed: true,
      finalBoardActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [finalImagePath],
      },
      appPreviewActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [finalImagePath],
      },
      stagedAssets: [{
        slotId: "mara-idle",
        sourcePath: finalImagePath,
        targetRelativePath: "lobby/mara/regular/idle.webp",
      }],
      publicArtRoot: join(root, "public-art"),
      manifestPath: join(root, "manifest.json"),
      receiptPath: join(root, "promotion-receipt.json"),
    });

    expect(promoted.status).toBe("promoted");
  });
});
