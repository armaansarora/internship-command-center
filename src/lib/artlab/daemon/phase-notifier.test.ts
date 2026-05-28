// src/lib/artlab/daemon/phase-notifier.test.ts
//
// Silent-catch regression coverage for the two file-read helpers inside
// `phase-notifier.ts` that previously swallowed JSON parse errors silently:
//   • `readRecommendation` — malformed `recommendation.json` dropped the
//     "💡 Recommended" caption line silently.
//   • `readSpend` — malformed `run-state.json` dropped the spend line on
//     the promotion-celebration silently.
//
// Both now emit a structured daemon-errors.jsonl entry (sources
// `phase-notifier-:125` and `phase-notifier-:282`) when their JSON parse
// fails. Without that telemetry, corrupt run artifacts could drift for
// days before anyone noticed the missing line on Telegram.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __testing } from "./phase-notifier";

describe("phase-notifier — silent-catch telemetry", () => {
  let workspaceRoot: string;
  let runDir: string;
  const previousWorkspace = process.env.ARTLAB_WORKSPACE_ROOT;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-phase-notifier-"));
    runDir = join(workspaceRoot, "runs", "r1");
    mkdirSync(runDir, { recursive: true });
    process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;
  });
  afterEach(() => {
    if (previousWorkspace === undefined) delete process.env.ARTLAB_WORKSPACE_ROOT;
    else process.env.ARTLAB_WORKSPACE_ROOT = previousWorkspace;
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("readRecommendation emits a phase-notifier-:125 daemon-error on malformed JSON", () => {
    // Write a garbage recommendation.json so JSON.parse throws.
    writeFileSync(join(runDir, "recommendation.json"), "{ this is not json");

    const result = __testing.readRecommendation(runDir);
    // Behavior is preserved: caller still gets undefined.
    expect(result).toBeUndefined();

    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(true);
    const lines = readFileSync(errPath, "utf8").split("\n").filter(Boolean);
    const entry = JSON.parse(lines[0]!) as { source: string; message: string };
    expect(entry.source).toBe("phase-notifier-:125");
    expect(typeof entry.message).toBe("string");
    expect(entry.message.length).toBeGreaterThan(0);
  });

  it("readRecommendation does NOT emit when the file simply doesn't exist", () => {
    // Existence-check short-circuit happens BEFORE the try/catch.
    const result = __testing.readRecommendation(runDir);
    expect(result).toBeUndefined();
    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(false);
  });

  it("readSpend emits a phase-notifier-:282 daemon-error on malformed run-state JSON", () => {
    const runStatePath = join(runDir, "run-state.json");
    writeFileSync(runStatePath, "{ broken json again");

    const result = __testing.readSpend(runStatePath);
    expect(result).toBeUndefined();

    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(true);
    const lines = readFileSync(errPath, "utf8").split("\n").filter(Boolean);
    const entry = JSON.parse(lines[0]!) as { source: string; message: string };
    expect(entry.source).toBe("phase-notifier-:282");
  });

  it("readSpend does NOT emit when run-state.json is well-formed but lacks spend fields", () => {
    // The try block parses fine; just the typeof guards fail. No catch fires.
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({ runId: "r1" }));
    const result = __testing.readSpend(join(runDir, "run-state.json"));
    expect(result).toBeUndefined();
    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(false);
  });
});
