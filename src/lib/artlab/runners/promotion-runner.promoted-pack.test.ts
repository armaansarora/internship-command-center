import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";
import { writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import {
  ArtLabPromotedPackManifestSchema,
  type ArtLabPromotedPackManifest,
} from "@/lib/artlab/sdk/asset-pack/promoted-manifest.schema";
import { handleArtLabAssetPackGet } from "@/lib/artlab/sdk/mcp/tool-handlers/asset-pack-get";

/**
 * Unit 6 — promotion-runner must write an SDK Asset Pack manifest under
 * `<projectRoot>/.artlab/engine/promoted/<packId>/manifest.json` so the
 * MCP `asset_pack_get` handler can serve the promoted bytes. Before this
 * unit, the promoted/ directory only held `.gitkeep` and asset-pack-get
 * threw `asset pack not found: <packId>` for every promoted run.
 */
function seedPassingRun(runDir: string, runId: string): void {
  mkdirSync(join(runDir, "cutouts"), { recursive: true });
  writeFileSync(join(runDir, "cutouts", "slot-1.png"), Buffer.from("MOCKPNG-A"));
  writeFileSync(join(runDir, "cutouts", "slot-2.png"), Buffer.from("MOCKPNG-B"));
  writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
  writeFileSync(join(runDir, "repair-plan.json"), JSON.stringify({ repairs: [] }));
  mkdirSync(join(runDir, "boards"), { recursive: true });
  writeFileSync(
    join(runDir, "boards", "final-board.json"),
    JSON.stringify({
      schemaVersion: "tower.creative-review-actions.v1",
      runId,
      boardType: "final-upload-ready",
      actions: [],
      localImagePaths: ["cutouts/slot-1.png"],
      promotesOnAction: false,
    }),
  );
  writeFileSync(
    join(runDir, "boards", "app-preview.json"),
    JSON.stringify({
      schemaVersion: "tower.creative-review-actions.v1",
      runId,
      boardType: "app-preview",
      actions: [],
      localImagePaths: ["cutouts/slot-1.png"],
      promotesOnAction: false,
    }),
  );
}

describe("promotion runner — writes SDK Asset Pack manifest at promotion", () => {
  let runDir: string;
  let publicArtRoot: string;
  let projectRoot: string;
  let prevProjectRoot: string | undefined;
  let prevPublicArtRoot: string | undefined;
  let prevPromotedRoot: string | undefined;
  let prevAutoCommit: string | undefined;

  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-pp-run-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pp-public-"));
    projectRoot = mkdtempSync(join(tmpdir(), "artlab-pp-proj-"));
    prevProjectRoot = process.env.ARTLAB_PROJECT_ROOT;
    prevPublicArtRoot = process.env.ARTLAB_PUBLIC_ART_ROOT;
    prevPromotedRoot = process.env.ARTLAB_PROMOTED_PACKS_ROOT;
    prevAutoCommit = process.env.ARTLAB_AUTO_COMMIT;
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
    process.env.ARTLAB_PROMOTED_PACKS_ROOT = join(projectRoot, ".artlab", "engine", "promoted");
    // Disable auto-commit/git path entirely — this test is about the
    // promoted/ manifest, not about staging/committing.
    process.env.ARTLAB_AUTO_COMMIT = "off";
  });

  afterEach(() => {
    if (prevPublicArtRoot === undefined) delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    else process.env.ARTLAB_PUBLIC_ART_ROOT = prevPublicArtRoot;
    if (prevProjectRoot === undefined) delete process.env.ARTLAB_PROJECT_ROOT;
    else process.env.ARTLAB_PROJECT_ROOT = prevProjectRoot;
    if (prevPromotedRoot === undefined) delete process.env.ARTLAB_PROMOTED_PACKS_ROOT;
    else process.env.ARTLAB_PROMOTED_PACKS_ROOT = prevPromotedRoot;
    if (prevAutoCommit === undefined) delete process.env.ARTLAB_AUTO_COMMIT;
    else process.env.ARTLAB_AUTO_COMMIT = prevAutoCommit;
  });

  it("writes manifest.json under .artlab/engine/promoted/<packId>/ with sha256 + files", async () => {
    const runId = "99999999-9999-4999-8999-999999999999";
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "character",
      characterId: "rafe-calder",
      phase: "promoting",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
      request: "promoted-pack manifest smoke",
    });
    seedPassingRun(runDir, runId);

    const result = await promotionRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "rafe-calder",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");

    const packId = `character-${runId.slice(0, 8)}`;
    const promotedDir = join(projectRoot, ".artlab", "engine", "promoted", packId);
    const manifestPath = join(promotedDir, "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const raw = readFileSync(manifestPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    const manifest: ArtLabPromotedPackManifest = ArtLabPromotedPackManifestSchema.parse(parsed);

    expect(manifest.packId).toBe(packId);
    expect(manifest.kind).toBe("character");
    expect(manifest.sourceRunId).toBe(runId);
    expect(manifest.characterId).toBe("rafe-calder");
    expect(manifest.files.length).toBeGreaterThanOrEqual(1);
    // Every file entry carries a 64-char lowercase hex sha256.
    for (const f of manifest.files) {
      expect(f.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(f.bytes).toBeGreaterThan(0);
    }
  });

  it("round-trips through asset-pack-get after promotion", async () => {
    const runId = "88888888-8888-4888-8888-888888888888";
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "character",
      characterId: "rafe-calder",
      phase: "promoting",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
      request: "promoted-pack round-trip",
    });
    seedPassingRun(runDir, runId);

    const result = await promotionRunner.run({
      runId,
      runDir,
      assetType: "character",
      characterId: "rafe-calder",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");

    const packId = `character-${runId.slice(0, 8)}`;
    const packsRoot = join(projectRoot, ".artlab", "engine", "promoted");

    const out = await handleArtLabAssetPackGet({ packId }, { packsRoot });
    expect(out.packId).toBe(packId);
    expect(out.files.length).toBeGreaterThanOrEqual(1);
    // asset-pack-get re-reads each file from disk — bytes > 0 confirms the
    // payload was actually copied/hardlinked under the pack dir.
    for (const f of out.files) {
      expect(f.bytes).toBeGreaterThan(0);
    }
  });

  it("maps non-character runner asset types to MCP kinds", async () => {
    const runId = "77777777-7777-4777-8777-777777777777";
    writeRunStateSnapshot(runDir, {
      runId,
      assetType: "ui-texture",
      phase: "promoting",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
      request: "ui-texture promoted-pack",
    });
    seedPassingRun(runDir, runId);

    const result = await promotionRunner.run({
      runId,
      runDir,
      assetType: "ui-texture",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");

    const packId = `ui-texture-${runId.slice(0, 8)}`;
    const manifestPath = join(
      projectRoot,
      ".artlab",
      "engine",
      "promoted",
      packId,
      "manifest.json",
    );
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    const manifest = ArtLabPromotedPackManifestSchema.parse(parsed);
    expect(manifest.kind).toBe("ui-texture");
  });
});
