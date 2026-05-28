// src/lib/artlab/bot/brief-advance.test.ts
//
// Unit 4 (2026-05-27) — `recordBriefAdjustmentAndReAuthor` must also write a
// rejection-ledger entry so brief-feedback teaches the brain across runs.
// Before this unit, brief adjustments were a per-run feedback ledger that
// disappeared with the run; the long-term taste signal was lost.

import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordBriefAdjustmentAndReAuthor } from "./brief-advance";
import { writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { readRejections } from "@/lib/artlab/memory/rejection-ledger";

describe("recordBriefAdjustmentAndReAuthor — rejection ledger wiring (Unit 4)", () => {
  let workspaceRoot: string;
  let runDir: string;
  const runId = "66666666-6666-6666-8666-666666666666";

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-brief-rej-"));
    runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "character",
      characterId: "rafe-calder",
      phase: "brief-review",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      request: "smoke",
    });
    // queue-entry.json is required by the auto-walker re-enqueue branch;
    // we don't care about it for this test, but write a stub so the test
    // never exercises the missing-entry path.
    writeFileSync(join(runDir, "queue-entry.json"), JSON.stringify({
      spec: { chatId: 1, assetType: "character", intent: "produce", characterId: "rafe-calder", request: "smoke" },
      runId,
      enqueuedAt: "2026-05-25T00:00:00.000Z",
    }));
  });

  it("writes a rejection ledger entry when a brief adjustment is recorded", async () => {
    const at = "2026-05-27T10:00:00.000Z";
    const result = await recordBriefAdjustmentAndReAuthor({
      workspaceRoot,
      runId,
      entry: { at, dimension: "palette", chosenOption: "palette-cool" },
    });
    expect(result.ok).toBe(true);
    const entries = readRejections(join(workspaceRoot, "memory"));
    expect(entries).toHaveLength(1);
    expect(entries[0]!.characterId).toBe("rafe-calder");
    expect(entries[0]!.reason).toBe("user-rejected-brief");
    expect(entries[0]!.codes).toEqual(["brief-feedback"]);
    expect(entries[0]!.source).toBe("character");
    expect(entries[0]!.at).toBe(at);
  });

  it("does not write a rejection if the run state has no characterId", async () => {
    const noCharRunId = "77777777-7777-7777-8777-777777777777";
    const noCharRunDir = join(workspaceRoot, "runs", noCharRunId);
    mkdirSync(noCharRunDir, { recursive: true });
    writeRunStateSnapshot(noCharRunDir, {
      runId: noCharRunId,
      assetType: "ui-texture",
      phase: "brief-review",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      request: "smoke without character",
    });
    writeFileSync(join(noCharRunDir, "queue-entry.json"), JSON.stringify({
      spec: { chatId: 1, assetType: "ui-texture", intent: "produce", request: "smoke" },
      runId: noCharRunId,
      enqueuedAt: "2026-05-25T00:00:00.000Z",
    }));
    await recordBriefAdjustmentAndReAuthor({
      workspaceRoot,
      runId: noCharRunId,
      entry: { at: "2026-05-27T10:00:00.000Z", dimension: "palette", chosenOption: "palette-warm" },
    });
    expect(existsSync(join(workspaceRoot, "memory", "style-rejections.jsonl"))).toBe(false);
  });
});
