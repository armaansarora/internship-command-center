import { describe, expect, it } from "vitest";
import {
  CHARACTER_ART_FINAL_APPROVAL_PHRASE,
  CHARACTER_OUTFIT_VARIANTS,
  CHARACTER_POSES,
  buildApprovedCharacterVisualAssetsFromRun,
  createCharacterArtRunPlan,
  getCharacterArtRunPromotionIssues,
  markCharacterArtRunFinalApproved,
  markCharacterArtRunProcessed,
  markCharacterArtRunPromoted,
  markCharacterArtRunQaPassed,
  validateCharacterArtRun,
  type CharacterArtProcessedSprite,
} from "@/lib/visual-assets";

describe("character art run contract", () => {
  const batchRunId = "fresh-otis-batch-test";

  it("creates an Otis batch run with only the initial and final human approval gates", () => {
    const run = createCharacterArtRunPlan({
      characterId: "otis",
      runId: batchRunId,
      assetVersion: "otis-v1",
      approvedIdentityRef: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
    });

    expect(run.schemaVersion).toBe("tower-character-art-run-v1");
    expect(run.characterId).toBe("otis");
    expect(run.styleId).toBe("tower-flat-plus-depth-v1");
    expect(run.humanApprovalGates.map((gate) => gate.id)).toEqual([
      "initial-character-design",
      "final-upload-ready-board",
    ]);
    expect(run.humanApprovalGates[0]).toMatchObject({
      id: "initial-character-design",
      status: "approved",
      approvedRef: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
    });
    expect(run.humanApprovalGates[1]).toMatchObject({
      id: "final-upload-ready-board",
      status: "pending",
      requiredPhrase: CHARACTER_ART_FINAL_APPROVAL_PHRASE,
    });

    expect(run.internalStages.map((stage) => stage.id)).toEqual([
      "production-packet",
      "pose-sheet-generation",
      "source-ingest",
      "sheet-splitting",
      "master-normalization",
      "derivative-export",
      "automated-qa",
      "final-review-board",
      "promotion",
    ]);

    expect(run.expectedSprites).toHaveLength(
      CHARACTER_OUTFIT_VARIANTS.length * CHARACTER_POSES.length,
    );
    expect(run.sourceBatches).toHaveLength(1 + CHARACTER_OUTFIT_VARIANTS.length * CHARACTER_POSES.length);
    expect(run.sourceBatches.map((batch) => batch.id).slice(0, 4)).toEqual([
      "production-packet",
      "sprite-regular-idle",
      "sprite-regular-greeting",
      "sprite-regular-listening",
    ]);
    expect(run.sourceBatches.find((batch) => batch.id === "sprite-winter-layered-working")).toMatchObject({
      kind: "individual-sprite",
      outfitVariant: "winter-layered",
      pose: "working",
      expectedArtifacts: ["winter-layered/working"],
    });
    expect(run.directories.stagedPublicRoot).toBe(
      `.artlab/characters/otis/staged-public/${batchRunId}`,
    );
    expect(run.directories.mastersRoot).toBe(
      `.artlab/characters/otis/masters/${batchRunId}`,
    );

    for (const sprite of run.expectedSprites) {
      expect(sprite.masterPath).toMatch(
        /^\.artlab\/characters\/otis\/masters\/fresh-otis-batch-test\/(regular|summer-light|winter-layered)\/[a-z-]+\.png$/,
      );
      expect(sprite.stagedRenditions.default.src).toMatch(
        /^\.artlab\/characters\/otis\/staged-public\/fresh-otis-batch-test\/art\/lobby\/otis\/(regular|summer-light|winter-layered)\/[a-z-]+\.webp$/,
      );
      expect(sprite.publicRenditions.default.src).toMatch(
        /^\/art\/lobby\/otis\/(regular|summer-light|winter-layered)\/[a-z-]+\.webp$/,
      );
    }

    expect(validateCharacterArtRun(run)).toEqual([]);
  });

  it("blocks promotion until QA passes and Armaan gives the exact final approval phrase", () => {
    const run = createCharacterArtRunPlan({
      characterId: "otis",
      runId: batchRunId,
      assetVersion: "otis-v1",
      approvedIdentityRef: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
    });

    expect(getCharacterArtRunPromotionIssues(run)).toContain(
      "Final upload-ready board has not been approved with the exact phrase.",
    );
    expect(() => markCharacterArtRunFinalApproved(run, "looks good")).toThrow(
      /approved for app/,
    );

    const finalApproved = markCharacterArtRunFinalApproved(
      run,
      CHARACTER_ART_FINAL_APPROVAL_PHRASE,
      "Armaan",
      "2026-05-14T16:00:00.000Z",
    );

    expect(finalApproved.finalApproval).toMatchObject({
      status: "approved",
      approvedBy: "Armaan",
      approvedAt: "2026-05-14T16:00:00.000Z",
    });
    expect(getCharacterArtRunPromotionIssues(finalApproved)).toContain(
      "Automated art QA has not passed.",
    );
  });

  it("blocks canary-only character pipeline runs from final approval and promotion", () => {
    const run = {
      ...createCharacterArtRunPlan({
        characterId: "otis",
        runId: "otis-canary-pipeline",
        assetVersion: "otis-v1",
        approvedIdentityRef: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
      }),
      canaryOnly: {
        notProductionCompletion: true as const,
        reason: "single cutout duplicated into all expected sprite slots to prove pipeline mechanics",
      },
    };

    expect(() => markCharacterArtRunFinalApproved(
      run,
      CHARACTER_ART_FINAL_APPROVAL_PHRASE,
    )).toThrow(/canary-only/i);
    expect(getCharacterArtRunPromotionIssues(run)).toContain(
      "Canary-only character pipeline runs cannot be promoted.",
    );
  });

  it("builds manifest-ready approved visual assets only from a promoted QA-passed run", () => {
    const run = createCharacterArtRunPlan({
      characterId: "otis",
      runId: batchRunId,
      assetVersion: "otis-v1",
      approvedIdentityRef: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
    });
    const processedSprites: CharacterArtProcessedSprite[] = run.expectedSprites.map(
      (sprite, index) => ({
        slotId: sprite.id,
        sourcePath: `.artlab/characters/otis/incoming/source-${index}.png`,
        sourceResolution: { width: 2400, height: 4096 },
        masterPath: sprite.masterPath,
        masterResolution: sprite.sourceFrame,
        checksum: `sha256-${index.toString().padStart(2, "0")}`,
        qaStatus: "passed",
        issues: [],
      }),
    );

    const promoted = markCharacterArtRunPromoted(
      markCharacterArtRunQaPassed(
        markCharacterArtRunProcessed(
          markCharacterArtRunFinalApproved(
            run,
            CHARACTER_ART_FINAL_APPROVAL_PHRASE,
            "Armaan",
            "2026-05-14T16:00:00.000Z",
          ),
          processedSprites,
        ),
        "2026-05-14T16:05:00.000Z",
      ),
      "2026-05-14T16:10:00.000Z",
    );

    expect(getCharacterArtRunPromotionIssues(promoted)).toEqual([]);

    const assets = buildApprovedCharacterVisualAssetsFromRun(promoted);
    expect(assets).toHaveLength(21);
    expect(assets[0]).toMatchObject({
      id: "otis-regular-idle",
      kind: "character",
      src: "/art/lobby/otis/regular/idle.webp",
      approvalStatus: "approved",
      sourceRunId: batchRunId,
      assetVersion: "otis-v1",
      checksum: "sha256-00",
      sourceResolution: { width: 2400, height: 4096 },
      masterResolution: { width: 2400, height: 4096 },
      qaStatus: "passed",
      promotionDate: "2026-05-14T16:10:00.000Z",
    });
  });

  it("blocks replacement QA when source art was upscaled instead of generated at native quality", () => {
    const run = createCharacterArtRunPlan({
      characterId: "otis",
      runId: "native-quality-failure-fixture",
      assetVersion: "otis-v2",
      approvedIdentityRef: ".artlab/characters/otis/references/identity/otis_identity-outfit-variants_v001_reference.png",
    });
    const processedSprites: CharacterArtProcessedSprite[] = run.expectedSprites.map(
      (sprite, index) => ({
        slotId: sprite.id,
        sourcePath: `.artlab/runs/otis/native-quality-failure-fixture/split/source-${index}.png`,
        sourceResolution: { width: 253, height: 887 },
        masterPath: sprite.masterPath,
        masterResolution: sprite.sourceFrame,
        checksum: `sha256-${index.toString().padStart(2, "0")}`,
        qaStatus: "passed",
        issues: ["source-long-edge-below-4096", "source-upscaled-to-master"],
      }),
    );
    const processedRun = markCharacterArtRunProcessed(run, processedSprites);

    expect(() => markCharacterArtRunQaPassed(processedRun)).toThrow(
      /source art is below the native 4K source contract/,
    );
  });
});
