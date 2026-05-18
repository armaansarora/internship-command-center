import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  extractReviewBoardImageSources,
  validateCreativeImageFile,
  validateReviewBoardImageReferences,
} from "./index";

describe("creative asset doctor", () => {
  it("extracts local image references from review board HTML", () => {
    expect(extractReviewBoardImageSources(`
      <main>
        <img alt="a" src="../images/a.png">
        <img src='./b.webp' alt="b">
      </main>
    `)).toEqual(["../images/a.png", "./b.webp"]);
  });

  it("passes decodable local review board images", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-review-board-ok-"));
    const boardPath = join(root, "review", "board.html");
    const imagePath = join(root, "images", "otis.png");

    mkdirSync(join(root, "review"), { recursive: true });
    mkdirSync(join(root, "images"), { recursive: true });
    await sharp({
      create: {
        width: 128,
        height: 192,
        channels: 4,
        background: "#aa8844",
      },
    }).png().toFile(imagePath);
    writeFileSync(boardPath, `<img src="../images/otis.png" alt="Otis">`);

    const result = await validateReviewBoardImageReferences({ boardPath });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.checkedImages[0]).toMatchObject({
      src: "../images/otis.png",
      width: 128,
      height: 192,
      format: "png",
    });
  });

  it("blocks missing review board images before a human approval board is shown", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-review-board-missing-"));
    const boardPath = join(root, "review", "board.html");

    mkdirSync(join(root, "review"), { recursive: true });
    writeFileSync(boardPath, `<img src="../missing/otis.png" alt="Broken Otis">`);

    const result = await validateReviewBoardImageReferences({ boardPath });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "missing-review-image",
      severity: "blocker",
      src: "../missing/otis.png",
    }));
  });

  it("blocks remote and data image sources in local production review boards", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-review-board-remote-"));
    const boardPath = join(root, "review", "board.html");

    mkdirSync(join(root, "review"), { recursive: true });
    writeFileSync(boardPath, `
      <img src="https://example.com/otis.png" alt="remote">
      <img src="data:image/png;base64,abc" alt="inline">
    `);

    const result = await validateReviewBoardImageReferences({ boardPath });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "external-review-image",
      "inline-review-image",
    ]);
  });

  it("flags low-resolution or non-alpha source files as production blockers when required", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-asset-doctor-lowres-"));
    const imagePath = join(root, "source.jpg");

    await sharp({
      create: {
        width: 64,
        height: 96,
        channels: 3,
        background: "#c8a66f",
      },
    }).jpeg().toFile(imagePath);

    const result = await validateCreativeImageFile({
      path: imagePath,
      minimumLongEdge: 4096,
      minimumShortEdge: 2300,
      requireAlpha: true,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "image-long-edge-below-minimum",
      "image-short-edge-below-minimum",
      "image-missing-alpha",
    ]);
  });
});
