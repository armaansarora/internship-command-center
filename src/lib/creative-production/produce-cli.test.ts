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
    expect(output).toContain("Current phase: awaiting-initial-approval");
    expect(output).toContain("human-action.json");
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
    const humanAction = readJson<{
      phase: string;
      allowedResponses: string[];
      recommendedResponse: string;
    }>(join(runRoot, "human-action.json"));

    expect(runState.phase).toBe("awaiting-initial-approval");
    expect(runState.gates).toEqual(["initial-design-direction", "final-app-promotion"]);
    expect(runState.publicArtWritesAllowed).toBe(false);
    expect(runState.promotionPhrase).toBe("approved for app");
    expect(progress.phase).toBe("awaiting-initial-approval");
    expect(progress.pending).toBeGreaterThan(0);
    expect(progress.nextAutomaticStep).toContain("Wait for initial design direction approval");
    expect(humanAction.phase).toBe("awaiting-initial-approval");
    expect(humanAction.allowedResponses).toEqual([
      "approve direction",
      "revise: <plain English change>",
      "reject/archive",
    ]);
    expect(humanAction.recommendedResponse).toBe("approve direction");
    expect(existsSync(join(runRoot, "events.jsonl"))).toBe(true);
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
    expect(output).toContain("awaiting initial approval");
    expect(output).toContain("Next automatic step");
    expect(output).toContain("Armaan action");
    expect(output).not.toContain("cutout-benchmark");
    expect(output).not.toContain("cutout-auto");
    expect(output).not.toContain("verify-canary");
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
