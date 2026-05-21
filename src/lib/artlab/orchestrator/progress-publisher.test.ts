import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishProgressOnce, startProgressHeartbeat } from "./progress-publisher";
import { readProgressSnapshot, writeRunStateSnapshot } from "../state/snapshots";

describe("progress publisher", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-progress-"));
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    });
    const slotLeasesDir = join(runDir, "slot-leases");
    mkdirSync(slotLeasesDir);
    writeFileSync(join(slotLeasesDir, "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
  });

  it("publishProgressOnce writes a progress snapshot", async () => {
    await publishProgressOnce(runDir);
    const snap = readProgressSnapshot(runDir);
    expect(snap).not.toBeNull();
    expect(snap!.slotsRunning).toBeGreaterThanOrEqual(1);
    expect(snap!.phase).toBe("production");
  });

  it("startProgressHeartbeat ticks at the interval and stops cleanly", async () => {
    const stop = startProgressHeartbeat(runDir, 25);
    await new Promise((r) => setTimeout(r, 80));
    stop();
    const snap = readProgressSnapshot(runDir);
    expect(snap).not.toBeNull();
  });
});
