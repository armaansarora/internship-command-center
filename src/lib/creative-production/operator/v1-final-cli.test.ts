import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("Creative Production Engine v1 final normal command surface", () => {
  it("starts and continues a guided run from durable files", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-cli-"));

    const startOutput = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      stateRoot,
      "--request",
      "make lobby buttons",
      "--run-id",
      "lobby-buttons-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(startOutput).toContain("Creative Production Engine orchestrator");
    expect(startOutput).toContain("No human action is required before initial concept images exist");
    expect(startOutput).toContain("progress.json");

    const runRoot = join(stateRoot, "ui-assets", "lobby-buttons-v1");
    const state = JSON.parse(readFileSync(join(runRoot, "run-state.json"), "utf8")) as {
      phase: string;
      publicArtWritesAllowed: boolean;
    };
    expect(state.phase).toBe("direction-generating");
    expect(state.publicArtWritesAllowed).toBe(false);
    expect(existsSync(join(runRoot, "human-action.json"))).toBe(false);

    const continueOutput = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      stateRoot,
      "--continue",
      "lobby-buttons-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(continueOutput).toContain("Run lobby-buttons-v1");
    expect(continueOutput).toContain("provider blocked");
    expect(continueOutput).toContain("Next automatic step");
    expect(continueOutput).toContain("approved for app");
  });

  it("renders v1 progress through art:status when a state root is supplied", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-status-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      stateRoot,
      "--request",
      "make Mara",
      "--run-id",
      "mara-status-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const statusOutput = execFileSync(tsx, [
      "scripts/art-pipeline.ts",
      "status",
      "--state-root",
      stateRoot,
      "--run-id",
      "mara-status-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(statusOutput).toContain("Run mara-status-v1");
    expect(statusOutput).toContain("Slots:");
    expect(statusOutput).toContain("Next automatic step");
  });

  it("renders the latest v1 progress through the normal art:status command", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-default-status-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      stateRoot,
      "--request",
      "make Mara",
      "--run-id",
      "mara-default-status-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const statusOutput = execFileSync(tsx, [
      "scripts/art-pipeline.ts",
      "status",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, TOWER_ART_STATUS_STATE_ROOT: stateRoot },
    });

    expect(statusOutput).toContain("Run mara-default-status-v1");
    expect(statusOutput).toContain("Slots:");
    expect(statusOutput).toContain("Next automatic step");
    expect(statusOutput).toContain("Promotion locked");
  });

  it("stops continue at upgrade-required when active improvement blockers exist", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "tower-cpe-upgrade-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      stateRoot,
      "--request",
      "make Mara",
      "--run-id",
      "mara-upgrade-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });
    mkdirSync(join(stateRoot, "ledgers"), { recursive: true });
    writeFileSync(join(stateRoot, "ledgers", "improvements.jsonl"), `${JSON.stringify({
      gate: "continuous-improvement",
      runId: "mara-upgrade-v1",
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
      stateRoot,
      "--continue",
      "mara-upgrade-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });
    const state = JSON.parse(readFileSync(join(stateRoot, "characters", "mara-upgrade-v1", "run-state.json"), "utf8")) as {
      phase: string;
    };

    expect(output).toContain("upgrade required");
    expect(output).toContain("receipt-conflict");
    expect(state.phase).toBe("upgrade-required");
  });
});
