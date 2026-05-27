// src/lib/artlab/runners/concept-critique-blocker.test.ts
//
// Unit tests for `writeConceptCritiqueFallbackBlocker` — the helper that
// turns a swallowed concept-critique fallback into a loud, operator-visible
// signal. Two outputs:
//   1. `blocker: "concept-critique-fallback"` written into the existing
//      `run-state.json` (when present), with `updatedAt` bumped.
//   2. A `{ at, source, message }` JSON line appended to
//      `<workspaceRoot>/daemon-errors.jsonl` so it surfaces in the health
//      view's "recent errors" tail and in `/health`.
//
// Regression: if no `run-state.json` exists yet (early-phase partial run),
// the helper still writes the daemon-error line and does NOT throw.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeConceptCritiqueFallbackBlocker } from "./concept-critique-blocker";
import { writeRunStateSnapshot } from "../state/snapshots";

describe("writeConceptCritiqueFallbackBlocker", () => {
  let workspaceRoot: string;
  let runDir: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-critique-blocker-"));
    runDir = join(workspaceRoot, "runs", "r1");
    mkdirSync(runDir, { recursive: true });
  });

  afterEach(() => { try { rmSync(workspaceRoot, { recursive: true }); } catch { /* ignore */ } });

  it("sets blocker on existing run-state and bumps updatedAt", () => {
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      characterId: "cro",
      phase: "concept-review",
      createdAt,
      updatedAt: createdAt,
      request: "make cro",
    });

    writeConceptCritiqueFallbackBlocker(workspaceRoot, runDir, "brain failed: 401 unauthorized");

    const parsed = JSON.parse(readFileSync(join(runDir, "run-state.json"), "utf8"));
    expect(parsed.blocker).toBe("concept-critique-fallback");
    expect(parsed.updatedAt).not.toBe(createdAt);
  });

  it("appends a daemon-error JSON line with source=concept-critique-fallback", () => {
    writeConceptCritiqueFallbackBlocker(workspaceRoot, runDir, "brain failed: boom");

    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(true);
    const lines = readFileSync(errPath, "utf8").split("\n").filter(Boolean);
    expect(lines.length).toBe(1);
    const entry = JSON.parse(lines[0]!);
    expect(entry.source).toBe("concept-critique-fallback");
    expect(typeof entry.at).toBe("string");
    expect(entry.message).toContain("concept-critique skipped");
    expect(entry.message).toContain("brain failed: boom");
  });

  it("still writes the daemon-error line when run-state.json does not exist (no throw)", () => {
    // No writeRunStateSnapshot beforehand — partial-run case.
    expect(() => {
      writeConceptCritiqueFallbackBlocker(workspaceRoot, runDir, "laneImages mismatch (real=3 expected=5)");
    }).not.toThrow();

    expect(existsSync(join(runDir, "run-state.json"))).toBe(false);
    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(true);
    const entry = JSON.parse(readFileSync(errPath, "utf8").trim());
    expect(entry.source).toBe("concept-critique-fallback");
    expect(entry.message).toContain("laneImages mismatch (real=3 expected=5)");
  });
});
