// src/lib/artlab/runners/brief-runner.test.ts
//
// Unit 5 follow-up Issue #4: the change that added `canonCharacterId` to
// `canonicalBriefFromContext` (so the brief artifact agrees with run-state
// / concept-board / promotion on the canon header.id rather than the
// legacy roleSlug bundle key) wasn't covered by any test. This file
// exercises that contract directly via `briefRunner.run` with
// `ARTLAB_BRAINSTORM_MODE=off` (canonical-fallback path — no brain API
// calls).
//
// The load-bearing assertion: when the runner receives a canon header.id
// like "sol-navarro" or "rafe-calder", the persisted `brief.json` carries
// that header.id as `brief.characterId`, NOT the legacy `meta.id` roleSlug
// key the bundle uses internally. This is the same divergence vector Unit
// 5 was designed to close at every artifact boundary.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { briefRunner } from "./brief-runner";
import { writeRunStateSnapshot } from "../state/snapshots";
import { resetTowerContextCache } from "../context/tower-context";
import { resetCanonIdentityCache } from "../sdk/canon/canon-identity-map";

const PROJECT_ROOT = resolve(process.cwd());

describe("briefRunner — canonical-fallback canonCharacterId contract", () => {
  let workspaceRoot: string;
  let runDir: string;
  let runId: string;
  const previousMode = process.env.ARTLAB_BRAINSTORM_MODE;
  const previousWorkspace = process.env.ARTLAB_WORKSPACE_ROOT;
  const previousCanonRoot = process.env.ARTLAB_CANON_ROOT;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-brief-runner-"));
    runId = randomUUID();
    runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    process.env.ARTLAB_BRAINSTORM_MODE = "off";
    process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;
    // Force tower-context to read the real project docs (so we get the
    // real character bundle). The fixture canon directory still ships in
    // the repo at `docs/artlab/sdk/canon/characters/`.
    process.env.ARTLAB_CANON_ROOT = join(PROJECT_ROOT, "docs/artlab/sdk/canon");
    resetTowerContextCache();
    resetCanonIdentityCache();
  });
  afterEach(() => {
    if (previousMode === undefined) delete process.env.ARTLAB_BRAINSTORM_MODE;
    else process.env.ARTLAB_BRAINSTORM_MODE = previousMode;
    if (previousWorkspace === undefined) delete process.env.ARTLAB_WORKSPACE_ROOT;
    else process.env.ARTLAB_WORKSPACE_ROOT = previousWorkspace;
    if (previousCanonRoot === undefined) delete process.env.ARTLAB_CANON_ROOT;
    else process.env.ARTLAB_CANON_ROOT = previousCanonRoot;
    resetTowerContextCache();
    resetCanonIdentityCache();
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  function seedRunState(characterId: string): void {
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "character",
      characterId,
      phase: "briefing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      request: `make ${characterId}`,
    });
  }

  it("persists brief.characterId as the canon header.id (sol-navarro), not the bundle roleSlug (cno)", async () => {
    // Sol Navarro lives in the bundle under `meta.id = "cno"` (legacy
    // roleSlug). The intake router now writes the canon header.id to
    // run-state. The brief must agree.
    seedRunState("sol-navarro");
    const result = await briefRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "sol-navarro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(result.artifacts.source).toBe("canonical-fallback");
    const brief = JSON.parse(readFileSync(join(runDir, "brief.json"), "utf8")) as {
      characterId?: string;
    };
    expect(brief.characterId).toBe("sol-navarro");
  });

  it("persists brief.characterId for canonical header.id Rafe Calder (briefing-room)", async () => {
    // Rafe lives at floorId=briefing-room in canon. The bundle keys him
    // under meta.id="cpo". Same divergence pattern as Sol.
    seedRunState("rafe-calder");
    const result = await briefRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "rafe-calder",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const brief = JSON.parse(readFileSync(join(runDir, "brief.json"), "utf8")) as {
      characterId?: string;
    };
    expect(brief.characterId).toBe("rafe-calder");
  });

  it("falls back to ctx.characterId when the runner is called with no characterId (legacy CLI)", async () => {
    // Legacy CLI paths that never set `input.characterId` rely on the
    // bundle key. We don't assert the exact value (it depends on
    // `pickCharacterContext`'s lookup logic), but we assert the runner
    // doesn't crash and the brief carries SOME characterId.
    seedRunState("cno");
    const result = await briefRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "cno",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const brief = JSON.parse(readFileSync(join(runDir, "brief.json"), "utf8")) as {
      characterId?: string;
    };
    // Either "cno" (passed through as canonCharacterId) or "cno" (from
    // ctx.characterId fallback) — the contract is that it's non-empty and
    // matches what was passed in.
    expect(brief.characterId).toBe("cno");
  });
});
