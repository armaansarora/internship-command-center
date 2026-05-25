import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readRunReality } from "./reconciler";
import { writeRunStateSnapshot, writeProgressSnapshot } from "./snapshots";
import { appendArtLabEvent } from "./events";

describe("artlab reconciler", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-recon-"));
  });

  it("composes run reality from snapshots, events, and absent artifacts", async () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:10.000Z",
      request: "make Rafe Calder",
    });
    writeProgressSnapshot(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:10.000Z",
      phase: "production",
      slotsCompleted: 4,
      slotsRunning: 1,
      slotsFailed: 0,
      actualSpendCents: 833,
      reservedCents: 100,
    });
    appendArtLabEvent(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:00.000Z",
      kind: "phase-transition",
      payload: { from: "routed", to: "generating-concepts" },
    });
    const reality = await readRunReality(dir);
    expect(reality?.runId).toBe("r1");
    expect(reality?.phase).toBe("production");
    expect(reality?.slots.completed).toBe(4);
    expect(reality?.slots.running).toBe(1);
    expect(reality?.spend.actualCents).toBe(833);
    expect(reality?.events.length).toBeGreaterThanOrEqual(1);
  });

  it("returns null when run-state.json is missing", async () => {
    const reality = await readRunReality(dir);
    expect(reality).toBeNull();
  });

  it("computes phase elapsed + remaining when phaseStartedAt is set", async () => {
    const startedAt = "2026-05-25T00:00:00.000Z";
    const now = new Date("2026-05-25T00:00:45.000Z");
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "production",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:30.000Z",
      phaseStartedAt: startedAt,
      request: "make Sol",
    });
    const reality = await readRunReality(dir, () => now);
    expect(reality?.progress.phaseStartedAt).toBe(startedAt);
    expect(reality?.progress.phaseElapsedMs).toBe(45_000);
    // production target ~210s → 165s remaining at +45s
    expect(reality?.progress.estimatedRemainingMs).toBe(165_000);
  });

  it("surfaces live slot count for production phase", async () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "production",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      phaseStartedAt: "2026-05-25T00:00:00.000Z",
      request: "make Sol",
    });
    mkdirSync(join(dir, "production-slots"));
    writeFileSync(join(dir, "production-slots", "regular-greeting.png"), "x");
    writeFileSync(join(dir, "production-slots", "regular-talking.png"), "x");
    writeFileSync(join(dir, "production-slots", "winter-layered-idle.png"), "x");
    writeFileSync(join(dir, "production-slots", "skip-me.json"), "ignored");
    const reality = await readRunReality(dir);
    expect(reality?.progress.expectedSlotCount).toBe(21);
    expect(reality?.progress.renderedSlotCount).toBe(3);
  });

  it("propagates monthly spend from external ledger when available", async () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    });
    writeFileSync(join(dir, "monthly-spend.json"), JSON.stringify({ monthlySpentCents: 12345, monthlyCeilingCents: 50000 }));
    const reality = await readRunReality(dir);
    expect(reality?.spend.monthlySpentCents).toBe(12345);
    expect(reality?.spend.monthlyCeilingCents).toBe(50000);
  });
});
