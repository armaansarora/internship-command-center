// src/lib/artlab/bot/gate-advance.test.ts
//
// Unit 4 (2026-05-27) — gate-advance reject path tests.
// Before this unit, Telegram reject buttons sent a plain text ack with no
// state mutation and no learning surface. `rejectGate` now (a) sets the run
// blocker to "cancelled", (b) writes a rejection ledger entry so the brain
// learns from the human's "this is wrong" signal across runs.

import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advanceConceptApproval, rejectGate } from "./gate-advance";
import { writeRunStateSnapshot, readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { readRejections } from "@/lib/artlab/memory/rejection-ledger";
import { writeFileSync } from "node:fs";

describe("rejectGate (Unit 4)", () => {
  let workspaceRoot: string;
  let runDir: string;
  const runId = "55555555-5555-5555-8555-555555555555";

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-gate-reject-"));
    runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "character",
      characterId: "sol-navarro",
      phase: "concept-review",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      request: "reject-gate smoke",
    });
    // queue-entry.json — required for `findLatestRunAtPhase` to consider
    // a run a real candidate. Reject path doesn't re-enqueue, but the
    // discovery helper still walks `runs/`.
    writeFileSync(join(runDir, "queue-entry.json"), JSON.stringify({ spec: { chatId: 1 } }));
  });

  it("sets blocker=cancelled and appends a rejection ledger entry for concept surface", async () => {
    const result = await rejectGate({ workspaceRoot, surface: "concept" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.runId).toBe(runId);

    const state = readRunStateSnapshot(runDir);
    expect(state!.blocker).toBe("cancelled");

    const entries = readRejections(join(workspaceRoot, "memory"));
    expect(entries).toHaveLength(1);
    expect(entries[0]!.characterId).toBe("sol-navarro");
    expect(entries[0]!.reason).toBe("user-rejected-run");
    expect(entries[0]!.codes).toEqual(["telegram-reject"]);
    expect(entries[0]!.source).toBe("character");
  });

  it("returns ok:false when no run is parked at the requested phase", async () => {
    // Mark the run blocked so it isn't a candidate.
    const state = readRunStateSnapshot(runDir);
    writeRunStateSnapshot(runDir, { ...state!, blocker: "cancelled" });
    const result = await rejectGate({ workspaceRoot, surface: "concept" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-run-at-concept-review");
    expect(existsSync(join(workspaceRoot, "memory", "style-rejections.jsonl"))).toBe(false);
  });

  it("approve path remains unchanged (advanceConceptApproval does NOT write rejections)", async () => {
    await advanceConceptApproval({ workspaceRoot, laneIndex: 3 });
    expect(existsSync(join(workspaceRoot, "memory", "style-rejections.jsonl"))).toBe(false);
  });
});
