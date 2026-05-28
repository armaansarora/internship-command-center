import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";
import {
  readRunStateSnapshot,
  writeRunStateSnapshot,
} from "@/lib/artlab/state/snapshots";
import { readStyleWins } from "@/lib/artlab/memory/style-ledger";
import { loadArtLabMemoryScope } from "@/lib/artlab/sdk/brain/memory-scope";

function seedPassingRun(runDir: string, runId: string): void {
  mkdirSync(join(runDir, "cutouts"), { recursive: true });
  writeFileSync(join(runDir, "cutouts", "slot-1.png"), JSON.stringify({ alpha: true }));
  writeFileSync(join(runDir, "cutouts", "slot-2.png"), JSON.stringify({ alpha: true }));
  writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
  writeFileSync(join(runDir, "repair-plan.json"), JSON.stringify({ repairs: [] }));
  mkdirSync(join(runDir, "boards"), { recursive: true });
  writeFileSync(join(runDir, "boards", "final-board.json"), JSON.stringify({
    schemaVersion: "tower.creative-review-actions.v1",
    runId,
    boardType: "final-upload-ready",
    actions: [],
    localImagePaths: ["cutouts/slot-1.png"],
    promotesOnAction: false,
  }));
  writeFileSync(join(runDir, "boards", "app-preview.json"), JSON.stringify({
    schemaVersion: "tower.creative-review-actions.v1",
    runId,
    boardType: "app-preview",
    actions: [],
    localImagePaths: ["cutouts/slot-1.png"],
    promotesOnAction: false,
  }));
}

describe("promotion runner — delegates to the real firewall", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promote-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-art-"));
  });

  it("refuses to write when the approval phrase is wrong (firewall blocker: approval-phrase-missing)", async () => {
    seedPassingRun(runDir, "r1");
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approve for app" })); // typo
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(String(result.failureCode)).toContain("firewall:");
    expect(String(result.failureCode)).toContain("approval-phrase-missing");
  });

  it("refuses to write when strict-qa did not pass (firewall blocker: strict-qa-missing)", async () => {
    seedPassingRun(runDir, "r1");
    writeFileSync(join(runDir, "repair-plan.json"), JSON.stringify({ repairs: [{ cutoutPath: "x", reason: "y", remediation: "z" }] }));
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(String(result.failureCode)).toContain("strict-qa-missing");
  });

  it("refuses to write when the final-board manifest is missing (firewall blocker: final-board-manifest-missing)", async () => {
    seedPassingRun(runDir, "r1");
    // Wipe the boards dir to simulate missing manifests
    writeFileSync(join(runDir, "boards", "final-board.json"), ""); // empty → JSON.parse will throw → exists:false
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(String(result.failureCode)).toContain("final-board-manifest-missing");
  });

  it("promotes successfully and writes to the canon floor (rafe-calder → war-room/rafe-calder)", async () => {
    seedPassingRun(runDir, "r1");
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
    // Pass the canon header.id (what intake now writes to run-state); the
    // runner resolves canon → floorId so the target path matches the
    // canonical floor instead of the legacy hardcoded `lobby/`.
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "rafe-calder", providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    const target = join(publicArtRoot, "war-room", "rafe-calder");
    expect(existsSync(target)).toBe(true);
    expect(readdirSync(target).length).toBeGreaterThan(0);
    // Lobby fallback path MUST NOT exist — the audit's `ls public/art/lobby/`
    // returned `cno otis` for characters that belong elsewhere; this
    // regression guard makes sure that bug can't reappear silently.
    expect(existsSync(join(publicArtRoot, "lobby", "rafe-calder"))).toBe(false);
    expect(existsSync(join(publicArtRoot, "lobby", "cro"))).toBe(false);
    const receiptPath = join(runDir, "promotion-receipt.json");
    expect(existsSync(receiptPath)).toBe(true);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    expect(receipt.approvalPhrase).toBe("approved for app");
    expect(receipt.runId).toBe("r1");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // promotedPackId contract — see Critical Finding 2.
  //
  // The ArtLab `generate_status` MCP handler reads `promotedPackId` off
  // run-state.json when phase=closed. Before this fix, promotion-runner
  // never wrote that field — the acceptance test hand-injected it on a
  // raw JSON rewrite, masking that production code didn't honour the
  // contract. Now promotion-runner derives a deterministic packId and
  // writes it onto the run-state via the canonical snapshot writer (so
  // the value goes through ArtLabRunStateSchema validation).
  // ─────────────────────────────────────────────────────────────────────────
  describe("promotedPackId — written onto run-state.json on successful promotion", () => {
    it("seeds run-state.json with the promoted pack id when promotion succeeds", async () => {
      // The runner reads run-state.json to look up spend, so it must exist
      // before promotion runs. Use the canonical writer so we hit the same
      // schema gate the runner does.
      const runId = "11111111-1111-4111-8111-111111111111";
      writeRunStateSnapshot(runDir, {
        runId,
        assetType: "character",
        characterId: "cro",
        phase: "promoting",
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
        request: "test promotion run",
      });
      seedPassingRun(runDir, runId);
      process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
      const result = await promotionRunner.run({
        runId, runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
      });
      delete process.env.ARTLAB_PUBLIC_ART_ROOT;
      expect(result.status).toBe("ok");
      // The runner's artifacts surface the same packId for downstream
      // observers (phase-notifier, ArtLab SDK status MCP).
      expect(result.artifacts.promotedPackId).toBe(`character-${runId.slice(0, 8)}`);
      // run-state.json was rewritten with the same value — this is what
      // the ArtLab status handler reads.
      const state = readRunStateSnapshot(runDir);
      expect(state).not.toBeNull();
      expect(state!.promotedPackId).toBe(`character-${runId.slice(0, 8)}`);
    });

    it("does NOT touch run-state.promotedPackId when promotion is blocked", async () => {
      const runId = "22222222-2222-4222-8222-222222222222";
      writeRunStateSnapshot(runDir, {
        runId,
        assetType: "character",
        characterId: "cro",
        phase: "promoting",
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
        request: "test promotion run",
      });
      seedPassingRun(runDir, runId);
      // Wrong phrase — firewall blocks; runner never advances.
      writeFileSync(
        join(runDir, "approval.json"),
        JSON.stringify({ phrase: "approve for app" }),
      );
      const result = await promotionRunner.run({
        runId, runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
      });
      expect(result.status).toBe("failed");
      const state = readRunStateSnapshot(runDir);
      expect(state!.promotedPackId).toBeUndefined();
    });

    it("derives packId from assetType + runId for non-character assets too", async () => {
      const runId = "33333333-3333-4333-8333-333333333333";
      writeRunStateSnapshot(runDir, {
        runId,
        assetType: "ui-texture",
        phase: "promoting",
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
        request: "ui-texture promotion run",
      });
      seedPassingRun(runDir, runId);
      process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
      const result = await promotionRunner.run({
        runId, runDir, assetType: "ui-texture", providerId: "local-mock",
      });
      delete process.env.ARTLAB_PUBLIC_ART_ROOT;
      expect(result.status).toBe("ok");
      expect(result.artifacts.promotedPackId).toBe(`ui-texture-${runId.slice(0, 8)}`);
      const state = readRunStateSnapshot(runDir);
      expect(state!.promotedPackId).toBe(`ui-texture-${runId.slice(0, 8)}`);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Unit 4 (2026-05-27) — style-wins.jsonl write must include
  // `source: "artlab-promotion"` so memory-scope.ts surfaces the win to
  // brain agents. Before this fix, every promotion win was written without
  // a `source` field; `memory-scope`'s `(w.source ?? "") === winSource`
  // filter excluded all of them and the brain ran with empty `recentWins`.
  // ───────────────────────────────────────────────────────────────────────
  describe("style-wins ledger — source field bridges memory-scope filter", () => {
    let workspaceRoot: string;
    let prevWorkspaceEnv: string | undefined;
    beforeEach(() => {
      workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-promote-workspace-"));
      prevWorkspaceEnv = process.env.ARTLAB_WORKSPACE_ROOT;
      process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;
    });
    afterEach(() => {
      if (prevWorkspaceEnv === undefined) delete process.env.ARTLAB_WORKSPACE_ROOT;
      else process.env.ARTLAB_WORKSPACE_ROOT = prevWorkspaceEnv;
    });

    it("writes style-wins.jsonl with source='artlab-promotion' and loadArtLabMemoryScope surfaces it", async () => {
      const runId = "44444444-4444-4444-8444-444444444444";
      writeRunStateSnapshot(runDir, {
        runId,
        assetType: "character",
        characterId: "rafe-calder",
        phase: "promoting",
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
        request: "promotion source-field smoke",
      });
      seedPassingRun(runDir, runId);
      process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
      const result = await promotionRunner.run({
        runId, runDir, assetType: "character", characterId: "rafe-calder", providerId: "local-mock",
      });
      delete process.env.ARTLAB_PUBLIC_ART_ROOT;
      expect(result.status).toBe("ok");

      const wins = readStyleWins(join(workspaceRoot, "memory"));
      expect(wins).toHaveLength(1);
      expect(wins[0]!.source).toBe("artlab-promotion");

      // loadArtLabMemoryScope must surface artlab-promotion wins to the
      // character-master agent (and would also surface them to any other
      // agent — promotion is a cross-agent source marker).
      const scope = loadArtLabMemoryScope(join(workspaceRoot, "memory"), "character-master", { topN: 3 });
      expect(scope.recentWins).toHaveLength(1);
      expect(scope.recentWins[0]!.techniques).toBe("artlab-pipeline");
    });
  });
});
