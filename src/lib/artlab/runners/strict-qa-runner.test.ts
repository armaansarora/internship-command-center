import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strictQaRunner } from "./strict-qa-runner";
import { readRejections } from "../memory/rejection-ledger";

describe("strict QA runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-qa-"));
    const cutoutDir = join(runDir, "cutouts");
    mkdirSync(cutoutDir);
    writeFileSync(join(cutoutDir, "slot-1.png"), JSON.stringify({ alpha: true }));
  });

  it("writes asset-doctor.json and repair-plan.json", async () => {
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "asset-doctor.json"))).toBe(true);
    expect(existsSync(join(runDir, "repair-plan.json"))).toBe(true);
  });

  it("emits repair-required blocker when repair plan non-empty", async () => {
    writeFileSync(join(runDir, "cutouts", "slot-2.png"), JSON.stringify({ alpha: false }));
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.blockerHint).toBe("repair-required");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Unit 4 (2026-05-27) — wires the rejection ledger so memory feeds forward.
// Before this, the brain agents' `recentRejections` array was always empty
// in production: `appendRejection` was a definition with zero callers. A
// forced strict-qa failure must now leave a `style-rejections.jsonl` entry
// in the workspace memory directory so the next refinement round can
// incorporate the failure pattern.
// ─────────────────────────────────────────────────────────────────────────
describe("strict QA runner — rejection ledger (Unit 4)", () => {
  let workspaceRoot: string;
  let runDir: string;
  let prevWorkspaceEnv: string | undefined;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-strict-qa-workspace-"));
    runDir = mkdtempSync(join(tmpdir(), "artlab-strict-qa-run-"));
    const cutoutDir = join(runDir, "cutouts");
    mkdirSync(cutoutDir);
    // alpha=false forces repairs.length > 0
    writeFileSync(join(cutoutDir, "slot-1.png"), JSON.stringify({ alpha: false }));
    prevWorkspaceEnv = process.env.ARTLAB_WORKSPACE_ROOT;
    process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;
  });

  afterEach(() => {
    if (prevWorkspaceEnv === undefined) delete process.env.ARTLAB_WORKSPACE_ROOT;
    else process.env.ARTLAB_WORKSPACE_ROOT = prevWorkspaceEnv;
  });

  it("appends a rejection entry to style-rejections.jsonl when repairs are required", async () => {
    const result = await strictQaRunner.run({
      runId: "rqa-1",
      runDir,
      assetType: "character",
      characterId: "sol-navarro",
      approvedLaneIndex: 3,
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.blockerHint).toBe("repair-required");

    const ledgerPath = join(workspaceRoot, "memory", "style-rejections.jsonl");
    expect(existsSync(ledgerPath)).toBe(true);
    const raw = readFileSync(ledgerPath, "utf8").trim().split("\n").filter(Boolean);
    expect(raw).toHaveLength(1);
    const entries = readRejections(join(workspaceRoot, "memory"));
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry!.characterId).toBe("sol-navarro");
    expect(entry!.reason).toBe("repair-required");
    expect(entry!.codes).toContain("alpha-missing");
    expect(entry!.lane).toBe(3);
    expect(entry!.source).toBe("character");
  });

  it("does NOT append a rejection entry when repairs is empty", async () => {
    // Replace failing cutout with a passing one
    writeFileSync(join(runDir, "cutouts", "slot-1.png"), JSON.stringify({ alpha: true }));
    const result = await strictQaRunner.run({
      runId: "rqa-2",
      runDir,
      assetType: "character",
      characterId: "sol-navarro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const ledgerPath = join(workspaceRoot, "memory", "style-rejections.jsonl");
    expect(existsSync(ledgerPath)).toBe(false);
  });
});
