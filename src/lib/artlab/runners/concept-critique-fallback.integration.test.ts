// src/lib/artlab/runners/concept-critique-fallback.integration.test.ts
//
// Integration coverage for the concept-critique fallback BLOCKER making
// it into run-state via the runner→orchestrator contract (Unit 3).
//
// Before this unit landed, the concept-runner wrote `blocker:
// "concept-critique-fallback"` to run-state OUT-OF-BAND via
// `writeConceptCritiqueFallbackBlocker`, then returned `{status:"ok"}` —
// after which the deterministic orchestrator overwrote run-state with
// `blocker: undefined`. The fix routes the blocker through the runner's
// result (`status:"failed", blockerHint:"concept-critique-fallback"`)
// so the orchestrator's existing failed-branch persists it.
//
// Two assertions:
//   1. conceptRunner returns `status:"failed"` + `blockerHint` when the
//      brain throws on `critique-concept-board`. The runner still
//      produces concept-board.json (the slot outputs are valid; only the
//      quality gate failed).
//   2. When the orchestrator drives that result, post-run state.json has
//      `blocker:"concept-critique-fallback"` (red: undefined; green: the
//      string).

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// Mock the claude-brain factory so the runner's `recommendBrain.decide`
// throws when it sees the `critique-concept-board` kind. Other brain kinds
// must succeed so the runner reaches the critique block — buildBrain
// invokes the brain for concept-prompt generation + recommend-direction
// before critique. We forward those kinds to the mock brain.
vi.mock("../orchestrator/claude-brain", async () => {
  const llm = await vi.importActual<typeof import("../orchestrator/llm-brain")>("../orchestrator/llm-brain");
  return {
    createClaudeBrain: vi.fn(() => ({
      modelId: "test-claude",
      async decide(req: { kind: string; input: unknown }) {
        if (req.kind === "critique-concept-board") {
          throw new Error("mocked claude critique 401 unauthorized");
        }
        return llm.decideWithMockBrain(req as Parameters<typeof llm.decideWithMockBrain>[0]);
      },
    })),
  };
});

// Force Gemini provider to placeholder so we don't make network calls,
// but lane.mode === "gemini" — so the laneImages count matches and the
// critique block IS entered (then throws via the brain mock above).
vi.mock("../providers/gemini-adapter", async () => {
  const actual = await vi.importActual<typeof import("../providers/gemini-adapter")>("../providers/gemini-adapter");
  return {
    ...actual,
    createGeminiProvider: vi.fn(() => ({
      async generateImage() {
        // Tiny valid PNG bytes — just the 8-byte signature is enough
        // for the runner; we never decode it.
        return {
          bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          mode: "live" as const,
          contentType: "image/png",
          costCents: 0,
          durationMs: 1,
        };
      },
    })),
  };
});

import { conceptRunner } from "./concept-runner";
import { runDeterministicTransition } from "../orchestrator/deterministic";
import { writeRunStateSnapshot, readRunStateSnapshot } from "../state/snapshots";
import { resetTowerContextCache } from "../context/tower-context";
import { resetCanonIdentityCache } from "../sdk/canon/canon-identity-map";

const PROJECT_ROOT = resolve(process.cwd());

describe("concept-critique-fallback — integration (Unit 3)", () => {
  let workspaceRoot: string;
  let runDir: string;
  let runId: string;
  const previousAnthropic = process.env.ANTHROPIC_API_KEY;
  const previousGemini = process.env.GEMINI_API_KEY;
  const previousGeminiMode = process.env.ARTLAB_GEMINI_MODE;
  const previousArtLabProvider = process.env.ARTLAB_BRAIN_PROVIDER;
  const previousWorkspace = process.env.ARTLAB_WORKSPACE_ROOT;
  const previousCanonRoot = process.env.ARTLAB_CANON_ROOT;
  const previousProjectRoot = process.env.ARTLAB_PROJECT_ROOT;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-concept-critique-int-"));
    runId = randomUUID();
    runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    // ANTHROPIC key (any value) routes through claude-brain (which is mocked).
    process.env.ANTHROPIC_API_KEY = "sk-test-key-not-real";
    // GEMINI key (any value) makes shouldUseRealGemini() return true so the
    // runner enters the brain critique path (which is mocked). The provider
    // is also mocked above so no network call lands.
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.ARTLAB_GEMINI_MODE;
    delete process.env.ARTLAB_BRAIN_PROVIDER;
    process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;
    process.env.ARTLAB_CANON_ROOT = join(PROJECT_ROOT, "docs/artlab/sdk/canon");
    process.env.ARTLAB_PROJECT_ROOT = PROJECT_ROOT;
    resetTowerContextCache();
    resetCanonIdentityCache();
  });

  afterEach(() => {
    if (previousAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousAnthropic;
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
    if (previousGeminiMode === undefined) delete process.env.ARTLAB_GEMINI_MODE;
    else process.env.ARTLAB_GEMINI_MODE = previousGeminiMode;
    if (previousArtLabProvider === undefined) delete process.env.ARTLAB_BRAIN_PROVIDER;
    else process.env.ARTLAB_BRAIN_PROVIDER = previousArtLabProvider;
    if (previousWorkspace === undefined) delete process.env.ARTLAB_WORKSPACE_ROOT;
    else process.env.ARTLAB_WORKSPACE_ROOT = previousWorkspace;
    if (previousCanonRoot === undefined) delete process.env.ARTLAB_CANON_ROOT;
    else process.env.ARTLAB_CANON_ROOT = previousCanonRoot;
    if (previousProjectRoot === undefined) delete process.env.ARTLAB_PROJECT_ROOT;
    else process.env.ARTLAB_PROJECT_ROOT = previousProjectRoot;
    resetTowerContextCache();
    resetCanonIdentityCache();
    rmSync(workspaceRoot, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("conceptRunner returns failed + blockerHint when critique brain throws", async () => {
    const result = await conceptRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "gemini-api",
    });
    expect(result.status).toBe("failed");
    expect(result.blockerHint).toBe("concept-critique-fallback");
    expect(result.failureCode).toBe("concept-critique-skipped");
    // The runner still produced the lane artifacts before the critique
    // failure — concept-board.json must exist so the operator can review
    // the lanes despite the missing quality gate.
    expect(existsSync(join(runDir, "concept-board.json"))).toBe(true);
  });

  it("orchestrator persists concept-critique-fallback blocker after runner returns failed", async () => {
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "character",
      characterId: "cro",
      phase: "generating-concepts",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      request: "make cro",
    });

    const outcome = await runDeterministicTransition({ runDir, providerId: "gemini-api" });
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toContain("runner-failed-concept-critique-skipped");

    const state = readRunStateSnapshot(runDir);
    expect(state).not.toBeNull();
    expect(state?.blocker).toBe("concept-critique-fallback");
    // Phase must remain generating-concepts — blockers don't move phase.
    expect(state?.phase).toBe("generating-concepts");
  });

  it("daemon-error is still recorded with source=concept-critique-fallback (Unit 1 telemetry preserved)", async () => {
    await conceptRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "gemini-api",
    });
    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(true);
    const lines = readFileSync(errPath, "utf8").split("\n").filter(Boolean);
    const sources = lines.map((l) => (JSON.parse(l) as { source: string }).source);
    expect(sources).toContain("concept-critique-fallback");
  });
});
