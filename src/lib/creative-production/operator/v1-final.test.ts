import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  CHARACTER_PRODUCTION_OUTFIT_VARIANTS,
  CHARACTER_PRODUCTION_POSE_STATES,
  applyCreativeHumanResponse,
  buildFinalBoardForCreativeRun,
  closeCreativeRunAfterGates,
  continueApprovedProductionForCreativeRun,
  generateInitialConceptsForCreativeRun,
  importLegacyOtisRun,
  markCreativeRunBrowserVerified,
  promoteApprovedCreativeRunForApp,
  renderCreativeStatusSummary,
  startCreativeProductionRun,
} from "./v1-final";
import {
  buildAppPreviewForCreativeRun,
  startWebsiteIntegrationBriefingForCreativeRun,
} from "./app-preview";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function writeTransparentFixture(path: string, color: string): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  await sharp({
    create: {
      width: 96,
      height: 144,
      channels: 4,
      background: color,
    },
  }).png().toFile(path);
}

describe("Creative Production Engine v1 final operator", () => {
  it("starts a routable character request in automatic direction generation without a pre-image human gate", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "let's make Mara",
      now: new Date("2026-05-19T12:00:00.000Z"),
    });

    expect(run.state.phase).toBe("direction-generating");
    expect(run.state.gates).toEqual(["initial-design-direction", "final-app-promotion"]);
    expect(run.state.publicArtWritesAllowed).toBe(false);
    expect(run.state.promotionPhrase).toBe("approved for app");
    expect(run.progress.phase).toBe("direction-generating");
    expect(run.progress.pending).toBe(5);
    expect(run.progress.nextAutomaticStep).toContain("Generate exactly five prompt-only initial concepts");
    expect(existsSync(join(run.runRoot, "human-action.json"))).toBe(false);
    expect(existsSync(join(run.runRoot, "progress.json"))).toBe(true);
    expect(existsSync(join(run.runRoot, "events.jsonl"))).toBe(true);
  });

  it("routes known character requests to characters even when floor language is present", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-route-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "Make Mara Voss, the CEO character for the C-Suite floor",
      now: new Date("2026-05-19T12:05:00.000Z"),
    });

    expect(run.state.assetType).toBe("character");
    expect(run.runRoot).toContain(join("characters", "2026-05-19-mara"));
    expect(run.progress.pending).toBe(5);
    expect(existsSync(join(run.runRoot, "human-action.json"))).toBe(false);
  });

  it("rejects approve direction before a concept board exists", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-human-gate-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara",
      runId: "mara-human-gate",
      now: new Date("2026-05-19T12:10:00.000Z"),
    });

    await expect(applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "approve direction",
    })).rejects.toThrow("concept board");
    expect(readJson<typeof run.state>(join(run.runRoot, "run-state.json")).phase).toBe("direction-generating");
  });

  it("runs five prompt-only initial concepts and stops at direction-review-ready with a board", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-concepts-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara Voss, CEO character from scratch",
      runId: "mara-concepts",
      now: new Date("2026-05-19T12:20:00.000Z"),
    });

    const finished = await generateInitialConceptsForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:21:00.000Z"),
      runner: async ({ plan }) => {
        const runningProgress = readJson<{ phase: string; runningSlots: string[]; pending: number }>(join(run.runRoot, "progress.json"));
        expect(runningProgress.phase).toBe("direction-generating");
        expect(runningProgress.runningSlots).toHaveLength(5);
        expect(runningProgress.pending).toBe(5);

        for (const slot of plan.slots) {
          mkdirSync(slot.inboxDirectory, { recursive: true });
          writeFileSync(slot.expectedInboxFile, "fake-png");
          writeFileSync(join(slot.inboxDirectory, "api-receipt.json"), JSON.stringify({
            slotId: slot.slotId,
            capturedFile: slot.expectedInboxFile,
            qualityWarnings: [],
          }, null, 2));
        }
      },
    });

    expect(finished.state.phase).toBe("direction-review-ready");
    expect(finished.progress.completed).toBe(5);
    expect(finished.progress.pending).toBe(0);
    expect(finished.humanAction?.allowedResponses).toContain("approve direction");
    expect(existsSync(join(run.runRoot, "review", "initial-concept-board.html"))).toBe(true);
    expect(existsSync(join(run.runRoot, "review", "initial-concept-action-manifest.json"))).toBe(true);
    const boardHtml = readFileSync(join(run.runRoot, "review", "initial-concept-board.html"), "utf8");

    expect(boardHtml).toContain("Initial Concept Board");
    expect(boardHtml).not.toContain('src=".artlab/');

    const summary = await renderCreativeStatusSummary({ stateRoot, runId: "mara-concepts" });

    expect(summary).toContain("Armaan action:");
    expect(summary).toContain("approve direction");
  });

  it("records the selected concept slot when Armaan approves a numbered direction", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-selected-concept-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara Voss, CEO character from scratch",
      runId: "mara-selected-concept",
      now: new Date("2026-05-19T12:25:00.000Z"),
    });

    await generateInitialConceptsForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:26:00.000Z"),
      runner: async ({ plan }) => {
        for (const slot of plan.slots) {
          mkdirSync(slot.inboxDirectory, { recursive: true });
          writeFileSync(slot.expectedInboxFile, "fake-png");
          writeFileSync(join(slot.inboxDirectory, "api-receipt.json"), JSON.stringify({
            slotId: slot.slotId,
            capturedFile: slot.expectedInboxFile,
            qualityWarnings: [],
          }, null, 2));
        }
      },
    });

    const approved = await applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "approve direction: 01",
      now: new Date("2026-05-19T12:27:00.000Z"),
    });
    const persisted = readJson<typeof approved>(join(run.runRoot, "run-state.json"));
    const selected = readJson<NonNullable<typeof approved.approvedInitialConcept>>(join(
      run.runRoot,
      "review",
      "approved-initial-concept.json",
    ));

    expect(approved.phase).toBe("initial-direction-approved");
    expect(approved.publicArtWritesAllowed).toBe(false);
    expect(persisted.approvedInitialConcept?.slotId).toBe("api-lane-01__initial-character-concept");
    expect(selected.slotId).toBe("api-lane-01__initial-character-concept");
    expect(selected.absoluteImagePath).toContain("api-lane-01");
    expect(approved.nextLegalAction).toContain("api-lane-01__initial-character-concept");
    expect(approved.nextLegalAction).toContain("final upload-ready board");
  });

  it("continues from approved initial design to the final upload-ready board without another human stop", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-auto-production-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara Voss, CEO character from scratch",
      runId: "mara-auto-production",
      now: new Date("2026-05-19T12:28:00.000Z"),
    });

    await generateInitialConceptsForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:29:00.000Z"),
      runner: async ({ plan }) => {
        for (const slot of plan.slots) {
          mkdirSync(slot.inboxDirectory, { recursive: true });
          writeFileSync(slot.expectedInboxFile, "fake-png");
          writeFileSync(join(slot.inboxDirectory, "api-receipt.json"), JSON.stringify({
            slotId: slot.slotId,
            capturedFile: slot.expectedInboxFile,
            qualityWarnings: [],
          }, null, 2));
        }
      },
    });
    await applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "approve direction: 01",
      now: new Date("2026-05-19T12:30:00.000Z"),
    });

    const expectedSpriteCount = CHARACTER_PRODUCTION_OUTFIT_VARIANTS.length * CHARACTER_PRODUCTION_POSE_STATES.length;
    const final = await continueApprovedProductionForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:31:00.000Z"),
      runner: async ({ plan }) => {
        const runningProgress = readJson<{ phase: string; runningSlots: string[]; pending: number }>(join(run.runRoot, "progress.json"));

        expect(runningProgress.phase).toBe("full-pack-running");
        expect(runningProgress.runningSlots).toHaveLength(expectedSpriteCount);
        expect(runningProgress.runningSlots).toContain("api-lane-01__mara-regular-idle");
        expect(runningProgress.runningSlots).toContain("api-lane-01__mara-summer-light-talking");
        expect(runningProgress.runningSlots).toContain("api-lane-01__mara-winter-layered-working");
        expect(runningProgress.pending).toBe(expectedSpriteCount);
        expect(plan.phase).toBe("production-pack");
        expect(plan.laneCount).toBe(1);
        expect(plan.maxConcurrency).toBe(5);
        expect(plan.slots).toHaveLength(expectedSpriteCount);
        expect(new Set(plan.slots.map((slot) => slot.baseSlotId))).toEqual(new Set([
          ...CHARACTER_PRODUCTION_OUTFIT_VARIANTS.flatMap((outfit) =>
            CHARACTER_PRODUCTION_POSE_STATES.map((pose) => `mara-${outfit.id}-${pose.id}`),
          ),
        ]));
        expect(plan.referenceImages[0]?.role).toBe("identity-reference");
        expect(plan.referenceImages[0]?.path).toContain("api-lane-01");
        expect(plan.slots[0]?.prompt).toContain("Required character pack matrix");
        expect(plan.slots.find((slot) => slot.baseSlotId === "mara-winter-layered-working")?.prompt).toContain("Outfit variant: winter-layered");
        expect(plan.slots.find((slot) => slot.baseSlotId === "mara-winter-layered-working")?.prompt).toContain("Pose/expression state: working");

        const checkedGeneratedImages = plan.slots.map((slot) => {
          const outputPath = join(run.runRoot, "sources", "production", slot.targetFilename);
          const receiptPath = join(slot.inboxDirectory, "api-receipt.json");

          mkdirSync(dirname(outputPath), { recursive: true });
          mkdirSync(slot.inboxDirectory, { recursive: true });
          writeFileSync(outputPath, `fake-final-png-${slot.slotId}`);
          writeFileSync(receiptPath, JSON.stringify({
            slotId: slot.slotId,
            capturedFile: outputPath,
            qualityWarnings: [],
          }, null, 2));

          return {
            slotId: slot.slotId,
            path: outputPath,
            latestReceiptPath: receiptPath,
            latestReceiptWarnings: [],
            issues: [],
          };
        });
        writeFileSync(join(plan.planRoot, "asset-doctor.json"), JSON.stringify({
          schemaVersion: "tower-creative-asset-doctor-v1",
          status: "passed",
          strict: true,
          checkedGeneratedImages,
          issues: [],
        }, null, 2));
      },
    });
    const state = readJson<typeof final.state>(join(run.runRoot, "run-state.json"));
    const humanAction = readJson<NonNullable<typeof final.humanAction>>(join(run.runRoot, "human-action.json"));

    expect(final.state.phase).toBe("final-board-ready");
    expect(final.progress.phase).toBe("final-board-ready");
    expect(final.progress.completed).toBe(expectedSpriteCount);
    expect(final.boardPath).toContain("final-upload-ready-board.html");
    expect(existsSync(join(run.runRoot, "review", "final-upload-ready-board.html"))).toBe(true);
    expect(state.publicArtWritesAllowed).toBe(false);
    expect(state.approvedInitialConcept?.slotId).toBe("api-lane-01__initial-character-concept");
    expect(humanAction.allowedResponses).toContain("approved for app");
    expect(humanAction.recommendedResponse).toBe("approved for app");
  });

  it("rejects a character final board until every outfit and pose-expression sprite passes QA", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-incomplete-character-final-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara",
      runId: "mara-incomplete-final",
    });
    const statePath = join(run.runRoot, "run-state.json");
    const assetDoctorPath = join(run.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");
    const state = readJson<typeof run.state>(statePath);

    mkdirSync(dirname(assetDoctorPath), { recursive: true });
    state.phase = "strict-qa";
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
    writeFileSync(assetDoctorPath, JSON.stringify({
      status: "passed",
      strict: true,
      checkedGeneratedImages: [
        {
          slotId: "api-lane-01__mara-regular-idle",
          path: ".artlab/inbox/mara/regular-idle.png",
          latestReceiptPath: ".artlab/inbox/mara/api-receipt.json",
          latestReceiptWarnings: [],
          issues: [],
        },
      ],
      issues: [],
    }, null, 2));

    await expect(buildFinalBoardForCreativeRun({
      runRoot: run.runRoot,
    })).rejects.toThrow("complete character production pack");
    expect(existsSync(join(run.runRoot, "review", "final-upload-ready-board.html"))).toBe(false);
  });

  it("promotes a final-approved character board into public art, generated manifest data, and app integration", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-promotion-project-"));
    const stateRoot = join(projectRoot, ".artlab", "studio");
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara Voss, CEO character from scratch",
      runId: "mara-promotion",
      now: new Date("2026-05-19T12:40:00.000Z"),
    });
    const statePath = join(run.runRoot, "run-state.json");
    const assetDoctorPath = join(run.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");
    const planPath = join(dirname(assetDoctorPath), "gemini-api-plan.json");
    const checkedGeneratedImages = [];

    mkdirSync(dirname(assetDoctorPath), { recursive: true });
    mkdirSync(join(projectRoot, "src", "lib", "visual-assets"), { recursive: true });
    writeFileSync(join(projectRoot, "src", "lib", "visual-assets", "approved-character-assets.generated.json"), "[]\n");

    for (const [index, slot] of CHARACTER_PRODUCTION_OUTFIT_VARIANTS.flatMap((outfit) =>
      CHARACTER_PRODUCTION_POSE_STATES.map((pose) => ({
        baseSlotId: `mara-${outfit.id}-${pose.id}`,
        slotId: `api-lane-01__mara-${outfit.id}-${pose.id}`,
      })),
    ).entries()) {
      const sourcePath = join(run.runRoot, "fixtures", `${slot.baseSlotId}.png`);

      await writeTransparentFixture(sourcePath, index % 2 === 0 ? "#c9a84c" : "#1a1a2e");
      checkedGeneratedImages.push({
        slotId: slot.slotId,
        path: sourcePath,
        latestReceiptPath: join(run.runRoot, "receipts", `${slot.slotId}.json`),
        latestReceiptWarnings: [],
        issues: [],
      });
    }

    writeFileSync(planPath, JSON.stringify({
      phase: "production-pack",
      slots: checkedGeneratedImages.map((image) => ({
        slotId: image.slotId,
        baseSlotId: image.slotId.replace("api-lane-01__", ""),
      })),
    }, null, 2));
    writeFileSync(assetDoctorPath, JSON.stringify({
      schemaVersion: "tower-creative-asset-doctor-v1",
      status: "passed",
      strict: true,
      checkedGeneratedImages,
      issues: [],
    }, null, 2));
    writeFileSync(statePath, `${JSON.stringify({
      ...readJson<typeof run.state>(statePath),
      phase: "strict-qa",
      approvedInitialConcept: {
        slotId: "api-lane-01__initial-character-concept",
        localImagePath: "concept.png",
        absoluteImagePath: join(run.runRoot, "concept.png"),
        actionManifestPath: join(run.runRoot, "review", "initial-concept-action-manifest.json"),
        boardPath: join(run.runRoot, "review", "initial-concept-board.html"),
        approvedAt: "2026-05-19T12:41:00.000Z",
        response: "approve direction: 01",
      },
    }, null, 2)}\n`);

    await buildFinalBoardForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:42:00.000Z"),
    });
    await applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "approved for app",
      now: new Date("2026-05-19T12:43:00.000Z"),
    });
    const promoted = await promoteApprovedCreativeRunForApp({
      runRoot: run.runRoot,
      projectRoot,
      masterLongEdge: 128,
      now: new Date("2026-05-19T12:44:00.000Z"),
    });
    const manifest = readJson<Array<{ id: string; src: string; characterId: string; qaStatus: string }>>(join(
      projectRoot,
      "src",
      "lib",
      "visual-assets",
      "approved-character-assets.generated.json",
    ));

    expect(promoted.state.phase).toBe("integrated");
    expect(promoted.state.publicArtWritesAllowed).toBe(false);
    expect(promoted.promotedPublicPaths).toHaveLength(63);
    expect(manifest).toHaveLength(21);
    expect(manifest.every((asset) => asset.characterId === "ceo" && asset.qaStatus === "passed")).toBe(true);
    expect(manifest.map((asset) => asset.id)).toContain("ceo-regular-idle");
    expect(existsSync(join(projectRoot, "public", "art", "penthouse", "ceo", "regular", "idle.webp"))).toBe(true);
    expect(existsSync(join(projectRoot, "public", "art", "penthouse", "ceo", "winter-layered", "working@3x.webp"))).toBe(true);
    expect(existsSync(promoted.receiptPath)).toBe(true);
    expect(readFileSync(join(run.runRoot, "events.jsonl"), "utf8")).toContain("app-promotion-integrated");

    const evidencePath = join(run.runRoot, "review", "app-browser-qa.json");

    writeFileSync(evidencePath, JSON.stringify({
      status: "passed",
      checks: ["manifest-render", "public-image-load", "no-fallback"],
    }, null, 2));

    const verified = await markCreativeRunBrowserVerified({
      runRoot: run.runRoot,
      evidencePath,
      now: new Date("2026-05-19T12:45:00.000Z"),
    });
    const closed = await closeCreativeRunAfterGates({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:46:00.000Z"),
    });

    expect(verified.state.phase).toBe("browser-verified");
    expect(closed.state.phase).toBe("closed");
    expect(closed.state.productionEvidence?.browserQaEvidencePath).toBe(evidencePath);
  });

  it("writes pre-image human-action only for a true provider blocker", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-provider-blocker-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara",
      runId: "mara-provider-blocker",
      now: new Date("2026-05-19T12:30:00.000Z"),
    });

    await generateInitialConceptsForCreativeRun({
      runRoot: run.runRoot,
      runner: async () => {
        throw new Error("Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.");
      },
    });

    const state = readJson<typeof run.state>(join(run.runRoot, "run-state.json"));
    const humanAction = readJson<{
      phase: string;
      allowedResponses: string[];
      recommendation: string;
    }>(join(run.runRoot, "human-action.json"));

    expect(state.phase).toBe("provider-blocked");
    expect(humanAction.phase).toBe("provider-blocked");
    expect(humanAction.recommendation).toContain("Fix the provider blocker");
    expect(humanAction.allowedResponses).not.toContain("approve direction");
  });

  it("does not make a concept board direction-review-ready when repeated style QA fails", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-style-fail-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Mara Voss, CEO character from scratch",
      runId: "mara-style-fail",
      now: new Date("2026-05-19T12:35:00.000Z"),
    });

    const finished = await generateInitialConceptsForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T12:36:00.000Z"),
      runner: async ({ plan }) => {
        for (const [index, slot] of plan.slots.entries()) {
          mkdirSync(slot.inboxDirectory, { recursive: true });
          writeFileSync(slot.expectedInboxFile, "fake-png");
          writeFileSync(join(slot.inboxDirectory, "api-receipt.json"), JSON.stringify({
            slotId: slot.slotId,
            capturedFile: slot.expectedInboxFile,
            qualityWarnings: index < 2 ? ["style-envelope-violation"] : [],
          }, null, 2));
        }
      },
    });

    expect(finished.state.phase).toBe("style-failed");
    expect(finished.progress.phase).toBe("style-failed");
    expect(finished.humanAction?.allowedResponses).not.toContain("approve direction");
    expect(existsSync(join(run.runRoot, "review", "initial-concept-board.html"))).toBe(false);
    expect(existsSync(join(run.runRoot, "review", "initial-concept-action-manifest.json"))).toBe(false);

    const qa = readJson<{
      status: string;
      repeatedFailureCodes: string[];
    }>(join(run.runRoot, "review", "initial-concept-qa.json"));

    expect(qa.status).toBe("failed");
    expect(qa.repeatedFailureCodes).toContain("style-envelope-violation");
  });

  it("resumes from run-state/progress/human-action instead of chat memory", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-resume-"));
    await startCreativeProductionRun({
      stateRoot,
      request: "create Otis from scratch",
      runId: "otis-v1",
      now: new Date("2026-05-19T12:00:00.000Z"),
    });

    const summary = await renderCreativeStatusSummary({ stateRoot, runId: "otis-v1" });

    expect(summary).toContain("Run otis-v1");
    expect(summary).toContain("direction generating");
    expect(summary).toContain("Next automatic step");
  });

  it("renders the active latest run instead of a lexicographically later archived root", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-latest-"));

    const archived = await startCreativeProductionRun({
      stateRoot,
      request: "make a C-Suite floor environment",
      runId: "archived-environment",
      now: new Date("2026-05-19T12:00:00.000Z"),
    });
    await applyCreativeHumanResponse({
      runRoot: archived.runRoot,
      response: "reject/archive",
      now: new Date("2026-05-19T12:01:00.000Z"),
    });
    await startCreativeProductionRun({
      stateRoot,
      request: "make Mara Voss, CEO character for the C-Suite floor",
      runId: "active-mara-character",
      now: new Date("2026-05-19T12:02:00.000Z"),
    });

    const summary = await renderCreativeStatusSummary({ stateRoot });

    expect(summary).toContain("Run active-mara-character");
    expect(summary).toContain("Mara (character)");
    expect(summary).not.toContain("archived-environment");
  });

  it("renders integrated promoted baselines without stale final-approval instructions", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-integrated-"));
    const runRoot = join(stateRoot, "characters", "otis-integrated-v1");

    mkdirSync(runRoot, { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      schemaVersion: "tower-creative-run-state-v1-final",
      runId: "otis-integrated-v1",
      assetType: "character",
      name: "Otis",
      request: "Imported current Otis production canary state.",
      phase: "integrated",
      gates: ["initial-design-direction", "final-app-promotion"],
      promotionPhrase: "approved for app",
      publicArtWritesAllowed: false,
      stateRoot,
      runRoot,
      createdAt: "2026-05-19T12:00:00.000Z",
      updatedAt: "2026-05-19T14:00:00.000Z",
      nextLegalAction: "Run browser QA for desktop, mobile, reduced motion, image loading, and overlap.",
    }, null, 2));
    writeFileSync(join(runRoot, "progress.json"), JSON.stringify({
      schemaVersion: "tower-creative-progress-v1",
      runId: "otis-integrated-v1",
      phase: "final-board-ready",
      runningSlots: [],
      completed: 24,
      failed: 0,
      repairing: 0,
      pending: 0,
      spendSoFarCents: 664.4,
      reservedSpendCents: 0,
      activeLocks: [],
      nextAutomaticStep: "Wait for Armaan to inspect the final upload-ready board and say approved for app before any promotion.",
      updatedAt: "2026-05-19T06:27:58.698Z",
    }, null, 2));
    writeFileSync(join(runRoot, "human-action.json"), JSON.stringify({
      schemaVersion: "tower-creative-human-action-v1",
      runId: "otis-integrated-v1",
      phase: "final-board-ready",
      recommendation: "Inspect the final board. If it is truly ready for app use, respond with the exact phrase approved for app.",
      allowedResponses: ["approved for app"],
      recommendedResponse: "approved for app",
    }, null, 2));

    const summary = await renderCreativeStatusSummary({ stateRoot, runId: "otis-integrated-v1" });

    expect(summary).toContain("Phase: integrated");
    expect(summary).toContain("Next automatic step: Run browser QA for desktop, mobile, reduced motion, image loading, and overlap.");
    expect(summary).toContain("Armaan action: none.");
    expect(summary).toContain("Promoted baseline protected");
    expect(summary).not.toContain("Promotion locked: yes");
    expect(summary).not.toContain("Recommended response: approved for app");
  });

  it("closes a browser-verified promoted baseline only after recording close gates", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-close-"));
    const runRoot = join(stateRoot, "characters", "otis-close-v1");
    const browserQaPath = ".artlab/runs/otis/otis-real-rembg-full-production-v1/browser-qa/browser-qa.json";

    mkdirSync(runRoot, { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      schemaVersion: "tower-creative-run-state-v1-final",
      runId: "otis-close-v1",
      assetType: "character",
      name: "Otis",
      request: "Imported current Otis production canary state.",
      phase: "browser-verified",
      gates: ["initial-design-direction", "final-app-promotion"],
      promotionPhrase: "approved for app",
      publicArtWritesAllowed: false,
      stateRoot,
      runRoot,
      createdAt: "2026-05-19T12:00:00.000Z",
      updatedAt: "2026-05-19T16:00:00.000Z",
      productionEvidence: {
        browserQaEvidencePath: browserQaPath,
        finalReviewBoardPath: ".artlab/runs/otis/otis-real-rembg-full-production-v1/review/final-upload-ready-board.html",
        publicArtRoot: "public/art/lobby/otis",
        approvedManifestPath: "src/lib/visual-assets/approved-character-assets.generated.json",
      },
    }, null, 2));
    writeFileSync(join(runRoot, "progress.json"), JSON.stringify({
      schemaVersion: "tower-creative-progress-v1",
      runId: "otis-close-v1",
      phase: "browser-verified",
      runningSlots: [],
      completed: 24,
      failed: 0,
      repairing: 0,
      pending: 0,
      spendSoFarCents: 664.4,
      reservedSpendCents: 0,
      activeLocks: [],
      nextAutomaticStep: "Close the run after housekeeping and continuous improvement gates pass.",
      updatedAt: "2026-05-19T16:00:00.000Z",
    }, null, 2));
    writeFileSync(join(runRoot, "human-action.json"), JSON.stringify({
      schemaVersion: "tower-creative-human-action-v1",
      runId: "otis-close-v1",
      phase: "browser-verified",
    }, null, 2));

    const closed = await closeCreativeRunAfterGates({
      runRoot,
      now: new Date("2026-05-19T16:15:00.000Z"),
    });
    const housekeepingLedger = readFileSync(join(stateRoot, "ledgers", "housekeeping.jsonl"), "utf8");
    const improvementLedger = readFileSync(join(stateRoot, "ledgers", "improvements.jsonl"), "utf8");
    const summary = await renderCreativeStatusSummary({ stateRoot, runId: "otis-close-v1" });

    expect(closed.state.phase).toBe("closed");
    expect(closed.state.publicArtWritesAllowed).toBe(false);
    expect(closed.progress.phase).toBe("closed");
    expect(closed.progress.activeLocks).toEqual([]);
    expect(closed.humanAction!.allowedResponses).toEqual([]);
    expect(housekeepingLedger).toContain("\"gate\":\"housekeeping\"");
    expect(housekeepingLedger).toContain(browserQaPath);
    expect(improvementLedger).toContain("\"gate\":\"continuous-improvement\"");
    expect(readFileSync(join(runRoot, "events.jsonl"), "utf8")).toContain("run-closed");
    expect(summary).toContain("Phase: closed");
    expect(summary).toContain("Armaan action: none.");
  });

  it("imports the current Otis canary state without force-unlocking or abandoning evidence", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-import-"));
    const runRoot = join(stateRoot, "characters", "otis-real-rembg-canary-v1");
    const generationRoot = join(runRoot, "generation", "gemini-api-v3");
    const fullRoot = join(generationRoot, "full");
    const canaryRoot = join(generationRoot, "canary");

    mkdirSync(fullRoot, { recursive: true });
    mkdirSync(canaryRoot, { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      schemaVersion: "tower-creative-run-state-v1",
      runId: "otis-real-rembg-canary-v1",
      assetType: "character",
      name: "Otis",
      state: "canary-passed",
      nextLegalAction: "Full-production-ready",
      publicArtWritesAllowed: false,
    }, null, 2));
    writeFileSync(join(generationRoot, "canary-gate.json"), JSON.stringify({ status: "passed" }));
    writeFileSync(join(generationRoot, "cutout-readiness.json"), JSON.stringify({ status: "ready" }));
    writeFileSync(join(fullRoot, "api-run-state.json"), JSON.stringify({
      status: "completed-with-warnings",
      selected: [{ slotId: "slot-a" }, { slotId: "slot-b" }],
      skipped: [{ slotId: "slot-c", reason: "not-in-selected-slot-filter" }],
      budget: { projectedCostCents: 664.4, budgetCents: 1000 },
    }, null, 2));
    writeFileSync(join(fullRoot, "cutout-doctor.json"), JSON.stringify({
      status: "passed",
      checked: [{ slotId: "slot-a", status: "passed" }],
      repeatedFailureCodes: [],
    }, null, 2));
    writeFileSync(join(canaryRoot, "repair-plan.json"), JSON.stringify({ status: "no-actions" }));

    const imported = await importLegacyOtisRun({
      runRoot,
      now: new Date("2026-05-19T13:00:00.000Z"),
    });

    expect(imported.state.phase).toBe("strict-qa");
    expect(imported.state.importedFrom?.legacyRunId).toBe("otis-real-rembg-canary-v1");
    expect(imported.state.publicArtWritesAllowed).toBe(false);
    expect(imported.progress.completed).toBe(2);
    expect(imported.progress.pending).toBe(1);
    expect(imported.progress.spendSoFarCents).toBe(664.4);
    expect(imported.progress.nextAutomaticStep).toContain("strict asset doctor");
    expect(imported.humanAction!.recommendedResponse).toBe("continue");
    expect(existsSync(join(runRoot, "v1-import-report.json"))).toBe(true);
    expect(readFileSync(join(runRoot, "events.jsonl"), "utf8")).toContain("legacy-otis-imported");
  });

  it("keeps imported Otis in strict QA when provider warnings were repaired by local cutout", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-import-ready-"));
    const runRoot = join(stateRoot, "characters", "otis-real-rembg-canary-v1");
    const fullRoot = join(runRoot, "generation", "gemini-api-v3", "full");

    mkdirSync(fullRoot, { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      runId: "otis-real-rembg-canary-v1",
      assetType: "character",
      name: "Otis",
      state: "canary-passed",
    }, null, 2));
    writeFileSync(join(fullRoot, "api-run-state.json"), JSON.stringify({
      status: "completed-with-warnings",
      selected: [{ slotId: "slot-a" }],
      skipped: [],
      budget: { projectedCostCents: 30.2 },
    }, null, 2));
    writeFileSync(join(fullRoot, "cutout-doctor.json"), JSON.stringify({ status: "passed" }));
    writeFileSync(join(fullRoot, "asset-doctor.json"), JSON.stringify({ status: "passed", strict: true }));

    const imported = await importLegacyOtisRun({
      runRoot,
      now: new Date("2026-05-19T13:30:00.000Z"),
    });

    expect(imported.state.phase).toBe("strict-qa");
    expect(imported.progress.nextAutomaticStep).toContain("Build the final upload-ready board");
  });

  it("keeps final app promotion locked behind the exact phrase", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-approval-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Otis",
      runId: "otis-approval",
    });
    const statePath = join(run.runRoot, "run-state.json");
    const state = readJson<typeof run.state>(statePath);
    state.phase = "app-preview-ready";
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

    await expect(applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "looks good",
    })).rejects.toThrow("exact phrase approved for app");

    const approved = await applyCreativeHumanResponse({
      runRoot: run.runRoot,
      response: "approved for app",
    });

    expect(approved.phase).toBe("approved-for-app");
    expect(approved.publicArtWritesAllowed).toBe(true);
  });

  it("builds a final upload-ready board and action manifest from strict asset doctor evidence", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-final-board-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make a lobby background",
      runId: "lobby-background-final-board",
    });
    const assetDoctorPath = join(run.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");
    const statePath = join(run.runRoot, "run-state.json");
    const state = readJson<typeof run.state>(statePath);

    mkdirSync(join(assetDoctorPath, ".."), { recursive: true });
    state.phase = "strict-qa";
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
    writeFileSync(assetDoctorPath, JSON.stringify({
      status: "passed",
      strict: true,
      checkedGeneratedImages: [
        {
          slotId: "pose-idle",
          path: ".artlab/inbox/otis/pose-idle.png",
          latestReceiptPath: ".artlab/inbox/otis/api-receipt.json",
          latestReceiptWarnings: [],
        },
      ],
    }, null, 2));

    const finalBoard = await buildFinalBoardForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T14:00:00.000Z"),
    });

    expect(finalBoard.state.phase).toBe("final-board-ready");
    expect(existsSync(join(run.runRoot, "review", "final-upload-ready-board.html"))).toBe(true);
    expect(existsSync(join(run.runRoot, "review", "action-manifest.json"))).toBe(true);
    expect(finalBoard.humanAction!.allowedResponses).toContain("approved for app");
    expect(finalBoard.progress.nextAutomaticStep).toContain("approved for app");
  });

  it("guides website integration through durable briefing and app preview artifacts before promotion", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-app-preview-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make a lobby background",
      runId: "lobby-background-app-preview",
    });
    const assetDoctorPath = join(run.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");
    const statePath = join(run.runRoot, "run-state.json");
    const state = readJson<typeof run.state>(statePath);

    mkdirSync(join(assetDoctorPath, ".."), { recursive: true });
    state.phase = "strict-qa";
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
    writeFileSync(assetDoctorPath, JSON.stringify({
      status: "passed",
      strict: true,
      checkedGeneratedImages: [
        {
          slotId: "pose-idle",
          path: ".artlab/inbox/otis/pose-idle.png",
          latestReceiptPath: ".artlab/inbox/otis/api-receipt.json",
          latestReceiptWarnings: [],
        },
      ],
    }, null, 2));

    await buildFinalBoardForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T14:00:00.000Z"),
    });
    const briefing = await startWebsiteIntegrationBriefingForCreativeRun({
      runRoot: run.runRoot,
      now: new Date("2026-05-19T14:05:00.000Z"),
    });

    expect(briefing.state.phase).toBe("integration-briefing");
    expect(briefing.state.publicArtWritesAllowed).toBe(false);
    expect(briefing.humanAction!.recommendation).toContain("where should it appear");
    expect(briefing.humanAction!.recommendation).toContain("mobile behavior");
    expect(briefing.humanAction!.recommendation).toContain("feature flag or immediate production path");

    const preview = await buildAppPreviewForCreativeRun({
      runRoot: run.runRoot,
      previewTitle: "Otis in Lobby shell",
      now: new Date("2026-05-19T14:10:00.000Z"),
    });

    expect(preview.state.phase).toBe("app-preview-ready");
    expect(preview.state.publicArtWritesAllowed).toBe(false);
    expect(existsSync(join(run.runRoot, "review", "app-preview-board.html"))).toBe(true);
    expect(existsSync(join(run.runRoot, "review", "app-preview-action-manifest.json"))).toBe(true);
    expect(preview.humanAction!.recommendedResponse).toBe("approved for app");
    expect(preview.progress.nextAutomaticStep).toContain("exact phrase approved for app");
  });
});
