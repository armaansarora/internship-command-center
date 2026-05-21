// src/lib/artlab/migration/baseline-recorder.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordBaseline, readBaseline } from "./baseline-recorder";

describe("baseline wall-clock recorder", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-base-"));
    mkdirSync(join(workspaceRoot, "runs", "rafe-001"), { recursive: true });
    const events = [
      { runId: "rafe-001", at: "2026-05-20T01:00:00.000Z", kind: "phase-transition", payload: { from: "routed", to: "generating-concepts" } },
      { runId: "rafe-001", at: "2026-05-20T01:22:00.000Z", kind: "phase-transition", payload: { from: "verifying", to: "closed" } },
    ];
    writeFileSync(join(workspaceRoot, "runs", "rafe-001", "events.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  });

  it("records baseline from events.jsonl first/last timestamps", async () => {
    const result = await recordBaseline({ workspaceRoot, runId: "rafe-001", label: "phase-4-rafe-baseline" });
    expect(result.wallClockMs).toBe(22 * 60_000);
    expect(result.label).toBe("phase-4-rafe-baseline");
    expect(existsSync(join(workspaceRoot, "ledgers", "baselines.jsonl"))).toBe(true);
  });

  it("readBaseline returns the most recent entry for a label", async () => {
    await recordBaseline({ workspaceRoot, runId: "rafe-001", label: "phase-4-rafe-baseline" });
    const baseline = await readBaseline({ workspaceRoot, label: "phase-4-rafe-baseline" });
    expect(baseline?.wallClockMs).toBe(22 * 60_000);
  });
});
