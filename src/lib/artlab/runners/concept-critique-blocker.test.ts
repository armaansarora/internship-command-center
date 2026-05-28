// src/lib/artlab/runners/concept-critique-blocker.test.ts
//
// Unit tests for `recordConceptCritiqueFallback` — the pure helper that
// turns a swallowed concept-critique fallback into a loud,
// operator-visible signal.
//
// Unit 3 (2026-05-27) split this helper's persistence layer: it used to
// also write `blocker: "concept-critique-fallback"` directly into the
// run's `run-state.json`, but the deterministic orchestrator overwrote
// that field on the next auto-transition. The blocker now flows through
// `ArtLabRunnerResult.blockerHint` and the orchestrator persists it via
// the state machine. This helper is now pure side-effect: it only
// records the daemon-error line and returns the blocker descriptor the
// runner lifts onto its result.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordConceptCritiqueFallback } from "./concept-critique-blocker";
import { readRejections } from "../memory/rejection-ledger";

describe("recordConceptCritiqueFallback", () => {
  let workspaceRoot: string;
  let runDir: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-critique-blocker-"));
    runDir = join(workspaceRoot, "runs", "r1");
    mkdirSync(runDir, { recursive: true });
  });

  afterEach(() => { try { rmSync(workspaceRoot, { recursive: true }); } catch { /* ignore */ } });

  it("returns the concept-critique-fallback blocker + failureCode descriptor", () => {
    const outcome = recordConceptCritiqueFallback(workspaceRoot, "brain failed: 401 unauthorized");
    expect(outcome.blocker).toBe("concept-critique-fallback");
    expect(outcome.failureCode).toBe("concept-critique-skipped");
    expect(outcome.reason).toBe("brain failed: 401 unauthorized");
  });

  it("appends a daemon-error JSON line with source=concept-critique-fallback", () => {
    recordConceptCritiqueFallback(workspaceRoot, "brain failed: boom");

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

  it("does NOT write run-state.json (persistence is owned by the orchestrator via blockerHint)", () => {
    // Pre-Unit-3 this helper wrote the blocker into run-state directly.
    // After the split, the runner returns `result.blockerHint` and the
    // orchestrator persists state. This helper must not touch run-state.
    recordConceptCritiqueFallback(workspaceRoot, "any reason");
    expect(existsSync(join(runDir, "run-state.json"))).toBe(false);
  });

  it("does not throw when daemon-errors.jsonl directory is unwritable (best-effort logging)", () => {
    // `recordDaemonError` swallows its own errors to keep the daemon
    // running. Pass a clearly invalid workspace path to exercise that
    // resilience — the helper still returns the descriptor.
    const outcome = recordConceptCritiqueFallback("/dev/null/this-cannot-exist", "boom");
    expect(outcome.blocker).toBe("concept-critique-fallback");
  });

  // Unit 4 — when a characterId is supplied, the helper also writes a
  // rejection ledger entry so the brain learns that this character's
  // concept-critique step was skipped. The daemon-error is operator
  // telemetry; the rejection ledger is brain-facing taste signal — these
  // are intentionally separate feeds.
  it("writes a rejection ledger entry when characterId is supplied", () => {
    recordConceptCritiqueFallback(workspaceRoot, "brain failed: 401 unauthorized", { characterId: "sol-navarro" });
    const entries = readRejections(join(workspaceRoot, "memory"));
    expect(entries).toHaveLength(1);
    expect(entries[0]!.characterId).toBe("sol-navarro");
    expect(entries[0]!.reason).toBe("critique-skipped");
    expect(entries[0]!.codes).toContain("brain-failure");
    expect(entries[0]!.source).toBe("character");
  });

  it("does NOT write a rejection ledger entry when characterId is omitted", () => {
    recordConceptCritiqueFallback(workspaceRoot, "brain failed: no char id");
    expect(existsSync(join(workspaceRoot, "memory", "style-rejections.jsonl"))).toBe(false);
  });
});
