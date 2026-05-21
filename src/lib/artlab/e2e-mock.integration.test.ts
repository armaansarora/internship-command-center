import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeRunStateSnapshot, readRunStateSnapshot } from "./state/snapshots";
import { runDeterministicTransition } from "./orchestrator/deterministic";

describe("artlab end-to-end mock run", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-e2e-"));
    process.env.ARTLAB_PUBLIC_ART_ROOT = mkdtempSync(join(tmpdir(), "artlab-e2e-public-"));
    process.env.ARTLAB_PLAYWRIGHT_MODE = "mock";
  });

  it("walks routed → closed with two simulated human gate approvals", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "rE2E",
      assetType: "character",
      characterId: "cro",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "mock e2e run",
    });

    for (let i = 0; i < 20; i += 1) {
      const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
      if (!outcome.applied) break;
    }
    expect(readRunStateSnapshot(runDir)?.phase).toBe("concept-review");

    const state1 = readRunStateSnapshot(runDir)!;
    writeRunStateSnapshot(runDir, {
      ...state1,
      phase: "canary",
      approvedConcept: { laneIndex: 2, approvedAt: new Date().toISOString(), approvedBy: "human" },
      updatedAt: new Date().toISOString(),
    });

    for (let i = 0; i < 20; i += 1) {
      const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
      if (!outcome.applied) break;
    }
    expect(readRunStateSnapshot(runDir)?.phase).toBe("final-review");

    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
    const state2 = readRunStateSnapshot(runDir)!;
    writeRunStateSnapshot(runDir, { ...state2, phase: "promoting", updatedAt: new Date().toISOString() });

    for (let i = 0; i < 20; i += 1) {
      const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
      if (!outcome.applied) break;
    }
    expect(readRunStateSnapshot(runDir)?.phase).toBe("closed");
  });
});
