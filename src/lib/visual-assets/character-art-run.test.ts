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
  it("creates an Otis batch run with only the initial and final human approval gates", () => {
    const run = createCharacterArtRunPlan({
      characterId: "otis",
      runId: "2026-05-14-otis-batch",
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
    expect(run.sourceBatches.map((batch) => batch.id)).toEqual([
      "production-packet",
      "pose-sheet-regular",
      "pose-sheet-summer-light",
      "pose-sheet-winter-layered",
    ]);
    expect(run.directories.stagedPublicRoot).toBe(
      ".artlab/characters/otis/staged-public/2026-05-14-otis-batch",
    );
    expect(run.directories.mastersRoot).toBe(
      ".artlab/characters/otis/masters/2026-05-14-otis-batch",
    );

    for (const sprite of run.expectedSprites) {
      expect(sprite.masterPath).toMatch(
        /^\.artlab\/characters\/otis\/masters\/2026-05-14-otis-batch\/(regular|summer-light|winter-layered)\/[a-z-]+\.png$/,
      );
      expect(sprite.stagedRenditions.default.src).toMatch(
        /^\.artlab\/characters\/otis\/staged-public\/2026-05-14-otis-batch\/art\/lobby\/otis\/(regular|summer-light|winter-layered)\/[a-z-]+\.webp$/,
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
      runId: "2026-05-14-otis-batch",
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

  it("builds manifest-ready approved visual assets only from a promoted QA-passed run", () => {
    const run = createCharacterArtRunPlan({
      characterId: "otis",
      runId: "2026-05-14-otis-batch",
      assetVersion: "otis-v1",
      approvedIdentityRef: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
    });
    const processedSprites: CharacterArtProcessedSprite[] = run.expectedSprites.map(
      (sprite, index) => ({
        slotId: sprite.id,
        sourcePath: `.artlab/characters/otis/incoming/source-${index}.png`,
        sourceResolution: { width: 1024, height: 1536 },
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
      sourceRunId: "2026-05-14-otis-batch",
      assetVersion: "otis-v1",
      checksum: "sha256-00",
      sourceResolution: { width: 1024, height: 1536 },
      masterResolution: { width: 2400, height: 4096 },
      qaStatus: "passed",
      promotionDate: "2026-05-14T16:10:00.000Z",
    });
  });
});
