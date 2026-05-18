import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("art:produce orchestrator", () => {
  it("routes natural-language creative requests through the canonical two-gate pipeline", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "Create Otis from scratch.",
      "--run-id",
      "otis-produce-v1",
      "--budget-cents",
      "600",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Creative Production Engine orchestrator");
    expect(output).toContain("Two human gates");
    expect(output).toContain("Current state: initial-concepts");
    expect(output).toContain("Next legal action");

    const runRoot = join(root, "characters", "otis-produce-v1");
    const runState = JSON.parse(readFileSync(join(runRoot, "run-state.json"), "utf8")) as {
      state: string;
      gates: string[];
      budgetCents: number;
    };

    expect(runState.state).toBe("initial-concepts");
    expect(runState.gates).toEqual(["initial-direction", "final-upload-ready-board"]);
    expect(runState.budgetCents).toBe(600);
    expect(existsSync(join(runRoot, "creative-brief.json"))).toBe(true);
    expect(existsSync(join(runRoot, "handoff.md"))).toBe(true);
  });

  it("continues from saved state without inventing an illegal next step", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-produce-continue-"));

    execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--request",
      "Create Otis from scratch.",
      "--run-id",
      "otis-produce-v1",
      "--budget-cents",
      "600",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const output = execFileSync(tsx, [
      "scripts/creative-production-orchestrator.ts",
      "--state-root",
      root,
      "--continue",
      "otis-produce-v1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Continuing run: otis-produce-v1");
    expect(output).toContain("Current state: initial-concepts");
    expect(output).toContain("Next legal action");
  });
});
