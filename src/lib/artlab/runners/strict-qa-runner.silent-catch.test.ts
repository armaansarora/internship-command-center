// src/lib/artlab/runners/strict-qa-runner.silent-catch.test.ts
//
// Silent-catch regression coverage for `strict-qa-runner.ts`. Before this
// unit landed, three internal catch blocks swallowed errors with no
// daemon-errors.jsonl entry:
//   • identity-drift probe (informational pHash comparison)
//   • Tower-context lookup for composite-board labels
//   • final-board composite rendering
//
// Each catch now records a structured daemon-error. These tests verify
// the three source names land in daemon-errors.jsonl when the relevant
// helpers throw — and that strict-qa's `status: "ok"` contract is
// preserved (the three catches are intentionally non-fatal).

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
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

// All three mocks must be hoisted ABOVE the runner import so vi.mock
// rewrites the dependency graph before the runner module is evaluated.
vi.mock("../coherence/identity-drift", () => ({
  measureIdentityDrift: vi.fn(async () => {
    throw new Error("identity-drift: pHash sampling boom");
  }),
}));
vi.mock("../context/tower-context", async () => {
  const actual = await vi.importActual<typeof import("../context/tower-context")>("../context/tower-context");
  return {
    ...actual,
    loadTowerContext: vi.fn(async () => { throw new Error("tower-context: bible YAML missing"); }),
  };
});
vi.mock("../speed/placeholder-images", async () => {
  const actual = await vi.importActual<typeof import("../speed/placeholder-images")>("../speed/placeholder-images");
  return {
    ...actual,
    composeFinalBoard: vi.fn(async () => { throw new Error("composeFinalBoard: sharp segfault"); }),
  };
});

import { strictQaRunner } from "./strict-qa-runner";

// Minimal PNG header bytes — strict-qa's `fileHasPngSignature` checks
// these to qualify a cutout PNG for the composeFinalBoard pipeline.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// IHDR + color-type=6 (RGBA) so detectAlpha returns true and the run
// passes the repair-plan gate (which is required to reach the
// identity-drift + composeFinalBoard catch blocks).
function rgbaPngBytes(): Buffer {
  const buf = Buffer.alloc(8 + 25);
  PNG_SIGNATURE.copy(buf, 0);
  // bytes 8..15: IHDR length + type (we don't bother to be valid past byte 25)
  buf[25] = 6; // color type 6 = RGB+alpha
  return buf;
}

describe("strict-qa-runner — silent-catch telemetry", () => {
  let workspaceRoot: string;
  let runDir: string;
  const previousWorkspace = process.env.ARTLAB_WORKSPACE_ROOT;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-strict-qa-silent-"));
    runDir = mkdtempSync(join(tmpdir(), "artlab-strict-qa-run-"));
    process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;
    // Seed a single RGBA cutout so detectAlpha returns true and the
    // runner reaches the identity-drift / composeFinalBoard branches.
    const cutoutDir = join(runDir, "cutouts");
    mkdirSync(cutoutDir, { recursive: true });
    writeFileSync(join(cutoutDir, "slot-1.png"), rgbaPngBytes());
    // Seed the reference concept-slot lane that identity-drift expects.
    const conceptSlotsDir = join(runDir, "concept-slots");
    mkdirSync(conceptSlotsDir, { recursive: true });
    writeFileSync(join(conceptSlotsDir, "lane-3.png"), rgbaPngBytes());
  });

  afterEach(() => {
    if (previousWorkspace === undefined) delete process.env.ARTLAB_WORKSPACE_ROOT;
    else process.env.ARTLAB_WORKSPACE_ROOT = previousWorkspace;
    rmSync(workspaceRoot, { recursive: true, force: true });
    rmSync(runDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  function readErrorSources(): string[] {
    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    if (!existsSync(errPath)) return [];
    return readFileSync(errPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => (JSON.parse(l) as { source: string }).source);
  }

  it("records strict-qa-identity-drift when measureIdentityDrift throws, and strict-qa-final-board when composeFinalBoard throws", async () => {
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      approvedLaneIndex: 3,
      providerId: "local-mock",
    });
    // Identity-drift + final-board are informational — strict-qa stays ok.
    expect(result.status).toBe("ok");

    const sources = readErrorSources();
    expect(sources).toContain("strict-qa-identity-drift");
    expect(sources).toContain("strict-qa-tower-context");
    expect(sources).toContain("strict-qa-final-board");
  });
});
