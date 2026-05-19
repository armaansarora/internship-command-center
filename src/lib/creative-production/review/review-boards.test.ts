import { describe, expect, it } from "vitest";
import {
  CREATIVE_REVIEW_ACTION_IDS,
  buildAppPreviewBoard,
  buildFinalUploadReadyReviewBoard,
  buildInitialConceptReviewBoard,
} from "./index";

const conceptSlots = [
  {
    slotId: "direction-a",
    label: "Direction A",
    localImagePath: "slots/direction-a.png",
    status: "candidate" as const,
    notes: "Sharp concierge silhouette.",
  },
  {
    slotId: "direction-b",
    label: "Direction B",
    localImagePath: "slots/direction-b.png",
    status: "candidate" as const,
    notes: "Warmer lobby presence.",
  },
];

describe("creative production review boards", () => {
  it("builds an initial concept board with pretty HTML and a machine action manifest", () => {
    const board = buildInitialConceptReviewBoard({
      runId: "mara-v1",
      recommendation: "Pick Direction A for the first production pack.",
      projectedCostCents: 120,
      slots: conceptSlots,
    });

    expect(board.html).toContain("<!doctype html>");
    expect(board.html).toContain("Initial Concept Board");
    expect(board.html).toContain("Pick Direction A");
    expect(board.actionManifest.boardType).toBe("initial-concept");
    expect(board.actionManifest.actions.map((action) => action.id)).toEqual([
      "approve-direction",
      "regenerate-named-slots",
      "revise-brief",
      "reject-archive",
    ]);
    expect(board.actionManifest.actions.some((action) => action.id === "approve-for-app")).toBe(false);
    expect(CREATIVE_REVIEW_ACTION_IDS).toEqual([
      "approve-direction",
      "regenerate-named-slots",
      "revise-brief",
      "approve-for-app",
      "reject-archive",
    ]);
  });

  it("builds a final upload-ready board with exact final approval action only after QA-passed assets", () => {
    const board = buildFinalUploadReadyReviewBoard({
      runId: "mara-v1",
      assets: [
        {
          slotId: "pose-idle",
          label: "Idle pose",
          localImagePath: "derived/pose-idle.png",
          status: "qa-passed",
          receipts: ["receipts/pose-idle.json"],
          evidence: ["sha256:abc123", "alpha-pass"],
          warnings: [],
          blockers: [],
        },
      ],
    });

    expect(board.html).toContain("Final Upload-Ready Board");
    expect(board.html).toContain("alpha-pass");
    expect(board.actionManifest.boardType).toBe("final-upload-ready");
    expect(board.actionManifest.actions).toContainEqual(expect.objectContaining({
      id: "approve-for-app",
      requiresExactPhrase: "approved for app",
    }));
  });

  it("rejects external image URLs and data URI shortcuts", () => {
    expect(() => buildInitialConceptReviewBoard({
      runId: "bad-external",
      recommendation: "Do not allow external image references.",
      projectedCostCents: 0,
      slots: [{
        slotId: "external",
        label: "External",
        localImagePath: "https://example.com/image.png",
        status: "candidate",
        notes: "Invalid.",
      }],
    })).toThrow("external image URLs");

    expect(() => buildFinalUploadReadyReviewBoard({
      runId: "bad-data-uri",
      assets: [{
        slotId: "inline",
        label: "Inline",
        localImagePath: "data:image/png;base64,aaaa",
        status: "qa-passed",
        receipts: [],
        evidence: [],
        warnings: [],
        blockers: [],
      }],
    })).toThrow("data URI");
  });

  it("builds an app preview board with required context checks but no promotion side effect", () => {
    const board = buildAppPreviewBoard({
      runId: "mara-v1",
      previewTitle: "Mara in Lobby shell",
      assetLocalPath: "derived/pose-idle.png",
      checks: {
        desktop: { status: "passed", evidence: "1440px screenshot captured" },
        mobile: { status: "passed", evidence: "390px screenshot captured" },
        reducedMotion: { status: "passed", evidence: "motion disabled" },
        fallback: { status: "warning", evidence: "fallback color is acceptable but plain" },
        brokenImage: { status: "passed", evidence: "all image refs resolved" },
        crop: { status: "passed", evidence: "head and feet remain visible" },
        overlap: { status: "blocked", evidence: "button overlaps the sprite on iPad" },
      },
    });

    expect(board.html).toContain("App Preview Board");
    expect(board.html).toContain("Desktop");
    expect(board.html).toContain("Reduced motion");
    expect(board.html).toContain("Broken image");
    expect(board.actionManifest.boardType).toBe("app-preview");
    expect(board.actionManifest.promotesOnAction).toBe(false);
    expect(board.actionManifest.previewChecks.map((check) => check.id)).toEqual([
      "desktop",
      "mobile",
      "reduced-motion",
      "fallback",
      "broken-image",
      "crop",
      "overlap",
    ]);
  });
});
