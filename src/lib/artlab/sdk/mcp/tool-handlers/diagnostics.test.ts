import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabDiagnostics } from "./diagnostics";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-diag-"));
  mkdirSync(join(workspaceRoot, "runs"), { recursive: true });
  mkdirSync(join(workspaceRoot, "inbox", "sdk"), { recursive: true });
});

function seedRun(runId: string, phase: string, updatedAt: string): void {
  const dir = join(workspaceRoot, "runs", runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "run-state.json"),
    JSON.stringify({
      runId,
      phase,
      blocker: null,
      createdAt: updatedAt,
      updatedAt,
    }),
  );
}

describe("handleArtLabDiagnostics", () => {
  it("returns at most 5 recent runs sorted by updatedAt descending", async () => {
    for (let i = 0; i < 7; i++) {
      seedRun(
        `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa${i.toString().padStart(3, "0")}`,
        "production",
        `2026-05-${10 + i}T12:00:00.000Z`,
      );
    }
    const result = await handleArtLabDiagnostics(
      {},
      {
        workspaceRoot,
        providerProbes: { gemini: async () => true, openai: async () => false },
      },
    );
    expect(result.recentRuns.length).toBeLessThanOrEqual(5);
    const updatedAts = result.recentRuns.map((r) => r.updatedAt);
    const sorted = [...updatedAts].sort().reverse();
    expect(updatedAts).toEqual(sorted);
  });

  it("reports backlog depth from the artlab inbox directory", async () => {
    writeFileSync(join(workspaceRoot, "inbox", "sdk", "generate-1.json"), "{}");
    writeFileSync(join(workspaceRoot, "inbox", "sdk", "generate-2.json"), "{}");
    const result = await handleArtLabDiagnostics(
      {},
      {
        workspaceRoot,
        providerProbes: {},
      },
    );
    expect(result.backlogDepth).toBe(2);
  });

  it("reports daemonUp=false when heartbeat is missing or stale > 60s", async () => {
    const result = await handleArtLabDiagnostics(
      {},
      {
        workspaceRoot,
        providerProbes: {},
      },
    );
    expect(result.daemonUp).toBe(false);
  });

  it("reports daemonUp=true when heartbeat is fresh (< 60s)", async () => {
    // Field name MUST match the canonical writer in
    // src/lib/artlab/daemon/entry.ts → `writeHeartbeat`, which emits `at`.
    // (Critical regression fix — see diagnostics.heartbeat-contract.integration.test.ts.)
    writeFileSync(
      join(workspaceRoot, "daemon-heartbeat.json"),
      JSON.stringify({
        at: new Date().toISOString(),
      }),
    );
    const result = await handleArtLabDiagnostics(
      {},
      {
        workspaceRoot,
        providerProbes: {},
      },
    );
    expect(result.daemonUp).toBe(true);
  });

  it("reports daemonUp=false when heartbeat carries the legacy `writtenAt` field only", async () => {
    // Guard against accidental re-introduction of the legacy field name.
    // If a future commit reverts to reading `writtenAt`, this test will
    // pass — and the production contract assertion in
    // diagnostics.heartbeat-contract.integration.test.ts will fail.
    writeFileSync(
      join(workspaceRoot, "daemon-heartbeat.json"),
      JSON.stringify({
        writtenAt: new Date().toISOString(),
      }),
    );
    const result = await handleArtLabDiagnostics(
      {},
      {
        workspaceRoot,
        providerProbes: {},
      },
    );
    expect(result.daemonUp).toBe(false);
  });
});
