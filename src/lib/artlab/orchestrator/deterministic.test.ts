import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDeterministicTransition } from "./deterministic";
import { writeRunStateSnapshot, readRunStateSnapshot } from "../state/snapshots";

describe("deterministic orchestrator", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-orch-"));
  });

  it("auto-advances routed → briefing → brief-review (gate)", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      characterId: "cro",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "make Rafe",
    });
    let outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(true);
    expect(readRunStateSnapshot(runDir)?.phase).toBe("briefing");
    outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(true);
    expect(readRunStateSnapshot(runDir)?.phase).toBe("brief-review");
    // brief-review is a human gate — should now halt
    outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toBe("awaiting-human-gate");
  });

  it("walks generating-concepts → concept-review when seeded mid-flow", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      characterId: "cro",
      phase: "generating-concepts",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "make Rafe",
    });
    const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(true);
    expect(readRunStateSnapshot(runDir)?.phase).toBe("concept-review");
  });

  it("halts on a human gate", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      characterId: "cro",
      phase: "concept-review",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    });
    const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toBe("awaiting-human-gate");
  });
});
