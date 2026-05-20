import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createCreativeBudgetLedger } from "./budget";
import {
  CHARACTER_PRODUCTION_OUTFIT_VARIANTS,
  CHARACTER_PRODUCTION_POSE_STATES,
  applyCreativeHumanResponse,
  buildFinalBoardForCreativeRun,
  generateInitialConceptsForCreativeRun,
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

    expect(run.state.phase).toBe("direction-generating");

    await generateInitialConceptsForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T15:00:30.000Z"),
      runner: async ({ plan }) => {
        await Promise.all(plan.slots.map(async (conceptSlot, index) => {
          mkdirSync(conceptSlot.inboxDirectory, { recursive: true });
          await sharp({
            create: {
              width: 96,
              height: 128,
              channels: 4,
              background: index % 2 === 0 ? "#c9a84c" : "#1a1a2e",
            },
          }).png().toFile(conceptSlot.expectedInboxFile);
          writeFileSync(join(conceptSlot.inboxDirectory, "api-receipt.json"), JSON.stringify({
            slotId: conceptSlot.slotId,
            capturedFile: conceptSlot.expectedInboxFile,
            qualityWarnings: [],
          }, null, 2));
        }));
      },
    });

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

    const finalImagePaths = CHARACTER_PRODUCTION_OUTFIT_VARIANTS.flatMap((outfit) =>
      CHARACTER_PRODUCTION_POSE_STATES.map((pose) => ({
        slotId: `api-lane-01__mara-${outfit.id}-${pose.id}`,
        path: join(root, "images", `mara-${outfit.id}-${pose.id}.png`),
      })),
    );
    const finalImagePath = finalImagePaths[0]!.path;
    const assetDoctorPath = join(run.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");

    mkdirSync(join(root, "images"), { recursive: true });
    mkdirSync(join(assetDoctorPath, ".."), { recursive: true });
    await Promise.all(finalImagePaths.map((image, index) =>
      sharp({
        create: {
          width: 128,
          height: 192,
          channels: 4,
          background: index % 2 === 0 ? "#c9a84c" : "#1a1a2e",
        },
      }).png().toFile(image.path),
    ));
    writeFileSync(join(run.runRoot, "run-state.json"), `${JSON.stringify({
      ...approvedDirection,
      phase: "strict-qa",
    }, null, 2)}\n`);
    writeFileSync(join(dirname(assetDoctorPath), "gemini-api-plan.json"), JSON.stringify({
      phase: "production-pack",
      slots: finalImagePaths.map((image) => ({
        slotId: image.slotId,
        baseSlotId: image.slotId.replace("api-lane-01__", ""),
      })),
    }, null, 2));
    writeFileSync(assetDoctorPath, JSON.stringify({
      status: "passed",
      strict: true,
      checkedGeneratedImages: finalImagePaths.map((image) => ({
        slotId: image.slotId,
        path: image.path,
        latestReceiptPath: join(root, "receipts", `${image.slotId}.json`),
        latestReceiptWarnings: [],
      })),
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
