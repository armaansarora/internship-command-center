import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyCreativeHumanResponse,
  buildFinalBoardForCreativeRun,
  importLegacyOtisRun,
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

describe("Creative Production Engine v1 final operator", () => {
  it("starts a vague request as a guided run with a human action packet and progress artifact", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "let's make Mara",
      now: new Date("2026-05-19T12:00:00.000Z"),
    });

    expect(run.state.phase).toBe("awaiting-initial-approval");
    expect(run.state.gates).toEqual(["initial-design-direction", "final-app-promotion"]);
    expect(run.state.publicArtWritesAllowed).toBe(false);
    expect(run.state.promotionPhrase).toBe("approved for app");
    expect(run.humanAction.allowedResponses).toEqual([
      "approve direction",
      "revise: <plain English change>",
      "reject/archive",
    ]);
    expect(run.humanAction.recommendedResponse).toBe("approve direction");
    expect(run.progress.phase).toBe("awaiting-initial-approval");
    expect(run.progress.pending).toBeGreaterThan(0);
    expect(run.progress.nextAutomaticStep).toContain("Wait for initial design direction approval");
    expect(existsSync(join(run.runRoot, "human-action.json"))).toBe(true);
    expect(existsSync(join(run.runRoot, "progress.json"))).toBe(true);
    expect(existsSync(join(run.runRoot, "events.jsonl"))).toBe(true);

    const persistedHumanAction = readJson<typeof run.humanAction>(join(run.runRoot, "human-action.json"));
    expect(persistedHumanAction.whatIUnderstood).toContain("Mara");
    expect(persistedHumanAction.costImpact.estimatedCents).toBeGreaterThan(0);
  });

  it("resumes from run-state/progress/human-action instead of chat memory", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-resume-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "create Otis from scratch",
      runId: "otis-v1",
      now: new Date("2026-05-19T12:00:00.000Z"),
    });

    const summary = await renderCreativeStatusSummary({ stateRoot, runId: "otis-v1" });

    expect(summary).toContain("Run otis-v1");
    expect(summary).toContain("awaiting initial approval");
    expect(summary).toContain(run.humanAction.recommendedResponse);
    expect(summary).toContain("Next automatic step");
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
    expect(imported.humanAction.recommendedResponse).toBe("continue");
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
      request: "make Otis",
      runId: "otis-final-board",
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
    expect(finalBoard.humanAction.allowedResponses).toContain("approved for app");
    expect(finalBoard.progress.nextAutomaticStep).toContain("approved for app");
  });

  it("guides website integration through durable briefing and app preview artifacts before promotion", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-v1-app-preview-"));
    const run = await startCreativeProductionRun({
      stateRoot,
      request: "make Otis",
      runId: "otis-app-preview",
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
    expect(briefing.humanAction.recommendation).toContain("where should it appear");
    expect(briefing.humanAction.recommendation).toContain("mobile behavior");
    expect(briefing.humanAction.recommendation).toContain("feature flag or immediate production path");

    const preview = await buildAppPreviewForCreativeRun({
      runRoot: run.runRoot,
      previewTitle: "Otis in Lobby shell",
      now: new Date("2026-05-19T14:10:00.000Z"),
    });

    expect(preview.state.phase).toBe("app-preview-ready");
    expect(preview.state.publicArtWritesAllowed).toBe(false);
    expect(existsSync(join(run.runRoot, "review", "app-preview-board.html"))).toBe(true);
    expect(existsSync(join(run.runRoot, "review", "app-preview-action-manifest.json"))).toBe(true);
    expect(preview.humanAction.recommendedResponse).toBe("approved for app");
    expect(preview.progress.nextAutomaticStep).toContain("exact phrase approved for app");
  });
});
