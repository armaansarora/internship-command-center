import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeRunStateSnapshot, readRunStateSnapshot, writeProgressSnapshot, readProgressSnapshot } from "./snapshots";

describe("artlab atomic snapshots", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-snap-"));
  });

  it("writes run-state.json with no tmp leftover", () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "test",
    });
    expect(existsSync(join(dir, "run-state.json"))).toBe(true);
    expect(readdirSync(dir).filter((f) => f.includes(".tmp"))).toHaveLength(0);
    const parsed = JSON.parse(readFileSync(join(dir, "run-state.json"), "utf8"));
    expect(parsed.runId).toBe("r1");
  });

  it("readRunStateSnapshot returns null when absent", () => {
    expect(readRunStateSnapshot(dir)).toBeNull();
  });

  it("writeProgressSnapshot writes progress.json", () => {
    writeProgressSnapshot(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:00.000Z",
      phase: "production",
      slotsCompleted: 3,
      slotsRunning: 1,
      slotsFailed: 0,
      actualSpendCents: 412,
      reservedCents: 100,
    });
    const parsed = readProgressSnapshot(dir);
    expect(parsed?.slotsCompleted).toBe(3);
  });

  it("rewriting run-state.json overwrites cleanly", () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "test",
    });
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "canary",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:01.000Z",
      request: "test",
    });
    const parsed = readRunStateSnapshot(dir);
    expect(parsed?.phase).toBe("canary");
  });
});
