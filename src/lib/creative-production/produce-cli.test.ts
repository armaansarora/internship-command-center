import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("art:produce orchestrator", () => {
  it("routes natural-language creative requests into the V1 final two-gate operator flow", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "Create Otis from scratch.",
      "--run-id",
      "otis-produce-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Creative Production Engine orchestrator");
    expect(output).toContain("Two human gates: initial design direction, final app promotion.");
    expect(output).toContain("Current phase: direction-generating");
    expect(output).toContain("No human action is required before initial concept images exist");
    expect(output).toContain("progress.json");
    expect(output).toContain("approved for app");

    const runRoot = join(root, "characters", "otis-produce-v1");
    const runState = readJson<{
      phase: string;
      gates: string[];
      publicArtWritesAllowed: boolean;
      promotionPhrase: string;
    }>(join(runRoot, "run-state.json"));
    const progress = readJson<{ phase: string; pending: number; nextAutomaticStep: string }>(join(runRoot, "progress.json"));

    expect(runState.phase).toBe("direction-generating");
    expect(runState.gates).toEqual(["initial-design-direction", "final-app-promotion"]);
    expect(runState.publicArtWritesAllowed).toBe(false);
    expect(runState.promotionPhrase).toBe("approved for app");
    expect(progress.phase).toBe("direction-generating");
    expect(progress.pending).toBe(5);
    expect(progress.nextAutomaticStep).toContain("Generate exactly five prompt-only initial concepts");
    expect(existsSync(join(runRoot, "human-action.json"))).toBe(false);
    expect(existsSync(join(runRoot, "events.jsonl"))).toBe(true);
  });

  it("supports a safe dry-run request that writes durable mock state without provider spend", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-dry-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "let's make Mara",
      "--run-id",
      "mara-dry-run-v1",
      "--dry-run",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const runRoot = join(root, "characters", "mara-dry-run-v1");
    const runState = readJson<{
      phase: string;
      executionMode?: string;
      providerMode?: string;
      publicArtWritesAllowed: boolean;
    }>(join(runRoot, "run-state.json"));
    const progress = readJson<{
      phase: string;
      spendSoFarCents: number;
      reservedSpendCents: number;
      nextAutomaticStep: string;
    }>(join(runRoot, "progress.json"));
    const humanAction = readJson<{
      phase: string;
      recommendation: string;
      costImpact: { estimatedCents: number; reservedCents: number };
      risk: string;
    }>(join(runRoot, "human-action.json"));
    const events = readFileSync(join(runRoot, "events.jsonl"), "utf8");

    expect(output).toContain("Dry run: yes");
    expect(output).toContain("Provider mode: local-mock");
    expect(output).toContain("Projected production cost");
    expect(runState).toMatchObject({
      phase: "awaiting-initial-approval",
      executionMode: "dry-run",
      providerMode: "local-mock",
      publicArtWritesAllowed: false,
    });
    expect(progress.spendSoFarCents).toBe(0);
    expect(progress.reservedSpendCents).toBe(0);
    expect(progress.nextAutomaticStep).toContain("Dry-run mock review");
    expect(humanAction.phase).toBe("awaiting-initial-approval");
    expect(humanAction.recommendation).toContain("dry-run mock review");
    expect(humanAction.costImpact.estimatedCents).toBeGreaterThan(0);
    expect(humanAction.costImpact.reservedCents).toBe(0);
    expect(humanAction.risk).toContain("no provider requests");
    expect(events).toContain("\"event\":\"dry-run-requested\"");
  });

  it("continues from saved V1 files without chat memory or legacy canary command invention", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-continue-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "Create Otis from scratch.",
      "--run-id",
      "otis-produce-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--continue",
      "otis-produce-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Run otis-produce-v1");
    expect(output).toContain("provider blocked");
    expect(output).toContain("Next automatic step");
    expect(output).toContain("Armaan action");
    expect(output).not.toContain("cutout-benchmark");
    expect(output).not.toContain("cutout-auto");
    expect(output).not.toContain("verify-canary");
  });

  it("closes a browser-verified run through housekeeping and improvement gates on continue", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-close-"));
    const runRoot = join(root, "characters", "otis-close-v1");

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
      stateRoot: root,
      runRoot,
      createdAt: "2026-05-19T12:00:00.000Z",
      updatedAt: "2026-05-19T16:00:00.000Z",
      productionEvidence: {
        browserQaEvidencePath: ".artlab/runs/otis/otis-real-rembg-full-production-v1/browser-qa/browser-qa.json",
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

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--continue",
      "otis-close-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const runState = readJson<{ phase: string }>(join(runRoot, "run-state.json"));

    expect(output).toContain("Phase: closed");
    expect(output).toContain("Armaan action: none.");
    expect(runState.phase).toBe("closed");
    expect(existsSync(join(root, "ledgers", "housekeeping.jsonl"))).toBe(true);
    expect(existsSync(join(root, "ledgers", "improvements.jsonl"))).toBe(true);
  });

  it("records plain-English answers and advances from durable files without stale human-action wording", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-answer-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "let's make Mara",
      "--run-id",
      "mara-answer-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const runRoot = join(root, "characters", "mara-answer-v1");

    mkdirSync(join(runRoot, "review"), { recursive: true });
    writeFileSync(join(runRoot, "review", "concept-01.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(runRoot, "review", "initial-concept-board.html"), "<html>board</html>");
    writeFileSync(join(runRoot, "review", "initial-concept-action-manifest.json"), JSON.stringify({
      schemaVersion: "tower.creative-review-actions.v1",
      runId: "mara-answer-v1",
      boardType: "initial-concept",
      actions: [
        {
          id: "regenerate-named-slots",
          slots: ["api-lane-01__initial-character-concept"],
        },
      ],
      localImagePaths: ["concept-01.png"],
      promotesOnAction: false,
      previewChecks: [],
      forbiddenShortcuts: ["external-image-url", "data-uri"],
    }, null, 2));
    const state = readJson<Record<string, unknown>>(join(runRoot, "run-state.json"));
    writeFileSync(join(runRoot, "run-state.json"), `${JSON.stringify({
      ...state,
      phase: "direction-review-ready",
      updatedAt: "2026-05-19T12:00:00.000Z",
    }, null, 2)}\n`);
    const progressBefore = readJson<Record<string, unknown>>(join(runRoot, "progress.json"));
    writeFileSync(join(runRoot, "progress.json"), `${JSON.stringify({
      ...progressBefore,
      phase: "direction-review-ready",
      completed: 5,
      pending: 0,
      runningSlots: [],
      nextAutomaticStep: "Wait at the initial concept review board.",
    }, null, 2)}\n`);

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--answer",
      "mara-answer-v1",
      "approve direction: 01",
      "--state-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const runState = readJson<{ phase: string; publicArtWritesAllowed: boolean; approvedInitialConcept?: { slotId: string } }>(join(runRoot, "run-state.json"));
    const progress = readJson<{ phase: string; nextAutomaticStep: string }>(join(runRoot, "progress.json"));

    expect(output).toContain("Recorded answer for mara-answer-v1");
    expect(output).toContain("Approved concept: api-lane-01__initial-character-concept");
    expect(output).not.toContain("Phase: initial direction approved");
    expect(output).not.toContain("Recommended response: approve direction");
    expect(runState.phase).toBe("provider-blocked");
    expect(runState.publicArtWritesAllowed).toBe(false);
    expect(runState.approvedInitialConcept?.slotId).toBe("api-lane-01__initial-character-concept");
    expect(progress.phase).toBe("provider-blocked");
    expect(progress.nextAutomaticStep).toContain("Fix this true production blocker");
  });

  it("stops continue at upgrade-required when active improvement blockers exist", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-upgrade-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "Create Otis from scratch.",
      "--run-id",
      "otis-produce-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    mkdirSync(join(root, "ledgers"), { recursive: true });
    writeFileSync(join(root, "ledgers", "improvements.jsonl"), `${JSON.stringify({
      gate: "continuous-improvement",
      runId: "otis-produce-v1",
      phase: "generation",
      category: "quality-failure",
      severity: "high",
      finding: "receipt conflict",
      action: "harden receipt reconciliation",
      failureCode: "receipt-conflict",
    })}\n`);

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--continue",
      "otis-produce-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const runState = readJson<{ phase: string }>(join(root, "characters", "otis-produce-v1", "run-state.json"));

    expect(output).toContain("upgrade required");
    expect(output).toContain("receipt-conflict");
    expect(runState.phase).toBe("upgrade-required");
  });
});
