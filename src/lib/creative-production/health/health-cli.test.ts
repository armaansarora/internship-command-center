import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("art:health command", () => {
  it("renders a plain-English safe-to-run report from v1 run state", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-health-"));
    const runRoot = join(stateRoot, "characters", "otis-health-v1");
    const generationRoot = join(runRoot, "generation", "gemini-api-v3");

    mkdirSync(generationRoot, { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      schemaVersion: "tower-creative-run-state-v1-final",
      runId: "otis-health-v1",
      assetType: "character",
      name: "Otis",
      phase: "strict-qa",
      updatedAt: "2026-05-19T12:00:00.000Z",
    }, null, 2));
    writeFileSync(join(runRoot, "progress.json"), JSON.stringify({
      schemaVersion: "tower-creative-progress-v1",
      runId: "otis-health-v1",
      phase: "strict-qa",
      spendSoFarCents: 242,
      reservedSpendCents: 0,
      activeLocks: [],
      nextAutomaticStep: "Build final upload-ready board.",
      updatedAt: "2026-05-19T12:00:00.000Z",
    }, null, 2));
    writeFileSync(join(runRoot, "human-action.json"), JSON.stringify({
      schemaVersion: "tower-creative-human-action-v1",
      runId: "otis-health-v1",
    }, null, 2));
    writeFileSync(join(generationRoot, "cutout-readiness.json"), JSON.stringify({
      status: "ready",
      slotChecks: [{
        selectedModel: { modelName: "isnet-general-use" },
      }],
      reasons: [],
    }, null, 2));

    const output = execFileSync(tsx, [
      "scripts/creative-production-health.ts",
      "--state-root",
      stateRoot,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Creative Production Engine Health");
    expect(output).toContain("Safe to run: yes");
    expect(output).toContain("Last run: otis-health-v1");
    expect(output).toContain("Build final upload-ready board.");
    expect(output).toContain("Spend: $2.42 spent");
    expect(output).toContain("Cutout: ready");
    expect(output).toContain("Continuous improvement blocks production: no");
  });

  it("renders integrated promoted baselines from run-state instead of stale final-approval progress", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-health-integrated-"));
    const runRoot = join(stateRoot, "characters", "otis-integrated-v1");

    mkdirSync(runRoot, { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      schemaVersion: "tower-creative-run-state-v1-final",
      runId: "otis-integrated-v1",
      assetType: "character",
      name: "Otis",
      phase: "integrated",
      nextLegalAction: "Run browser QA for desktop, mobile, reduced motion, image loading, and overlap.",
      updatedAt: "2026-05-19T14:00:00.000Z",
    }, null, 2));
    writeFileSync(join(runRoot, "progress.json"), JSON.stringify({
      schemaVersion: "tower-creative-progress-v1",
      runId: "otis-integrated-v1",
      phase: "final-board-ready",
      spendSoFarCents: 664.4,
      reservedSpendCents: 0,
      activeLocks: [],
      nextAutomaticStep: "Wait for Armaan to inspect the final upload-ready board and say approved for app before any promotion.",
      updatedAt: "2026-05-19T06:27:58.698Z",
    }, null, 2));
    writeFileSync(join(runRoot, "human-action.json"), JSON.stringify({
      schemaVersion: "tower-creative-human-action-v1",
      runId: "otis-integrated-v1",
    }, null, 2));

    const output = execFileSync(tsx, [
      "scripts/creative-production-health.ts",
      "--state-root",
      stateRoot,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Last run: otis-integrated-v1 (integrated)");
    expect(output).toContain("Next step: Run browser QA for desktop, mobile, reduced motion, image loading, and overlap.");
    expect(output).not.toContain("approved for app");
  });

  it("fails closed when active locks and repeated high-severity improvements are present", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-health-blocked-"));
    const runRoot = join(stateRoot, "characters", "otis-health-v1");

    mkdirSync(runRoot, { recursive: true });
    mkdirSync(join(stateRoot, "ledgers"), { recursive: true });
    writeFileSync(join(runRoot, "run-state.json"), JSON.stringify({
      schemaVersion: "tower-creative-run-state-v1-final",
      runId: "otis-health-v1",
      assetType: "character",
      name: "Otis",
      phase: "provider-blocked",
      updatedAt: "2026-05-19T12:00:00.000Z",
    }, null, 2));
    writeFileSync(join(runRoot, "progress.json"), JSON.stringify({
      schemaVersion: "tower-creative-progress-v1",
      runId: "otis-health-v1",
      phase: "provider-blocked",
      spendSoFarCents: 0,
      reservedSpendCents: 30,
      activeLocks: ["api-run.lock"],
      nextAutomaticStep: "Wait for active generation to finish.",
      updatedAt: "2026-05-19T12:00:00.000Z",
    }, null, 2));
    writeFileSync(join(runRoot, "api-run.lock"), "locked");
    writeFileSync(join(stateRoot, "ledgers", "improvements.jsonl"), `${JSON.stringify({
      gate: "continuous-improvement",
      runId: "otis-health-v1",
      phase: "generation",
      category: "quality-failure",
      severity: "high",
      finding: "receipt conflict",
      action: "harden receipts",
      failureCode: "receipt-conflict",
      hardening: {
        command: "npm run art:health",
        test: "npm test src/lib/creative-production/health/health-cli.test.ts",
        doc: "docs/CREATIVE-PRODUCTION-ENGINE.md#budget-and-spend-control-architecture",
      },
    })}\n`);

    const output = execFileSync(tsx, [
      "scripts/creative-production-health.ts",
      "--state-root",
      stateRoot,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Safe to run: no");
    expect(output).toContain("Active locks: 1");
    expect(output).toContain("Continuous improvement blocks production: yes");
    expect(output).toContain("receipt-conflict");
    expect(output).toContain("npm run art:health");
  });
});
