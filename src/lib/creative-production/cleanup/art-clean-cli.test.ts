import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("art:clean registry integration", () => {
  it("writes a durable artifact registry and reports cleanup through registry rules when executing", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-clean-"));

    const output = execFileSync(tsx, [
      join(process.cwd(), "scripts/art-pipeline.ts"),
      "clean",
      "otis",
      "--run-id",
      "otis-clean-v1",
    ], { cwd: root, encoding: "utf8" });
    const parsed = JSON.parse(output) as {
      registryPath: string;
      cleanupPlan: {
        protected: string[];
        delete: string[];
      };
    };

    expect(parsed.registryPath).toBe(".artlab/studio/artifact-registry.json");
    expect(parsed.cleanupPlan.protected).toContain("public/art/lobby/otis/");
    expect(existsSync(join(root, parsed.registryPath))).toBe(true);
    expect(JSON.parse(readFileSync(join(root, parsed.registryPath), "utf8"))).toMatchObject({
      schemaVersion: "tower-creative-retention-registry-v1",
    });
  });

  it("does not write the artifact registry during dry-run cleanup", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-clean-dry-run-"));

    const output = execFileSync(tsx, [
      join(process.cwd(), "scripts/art-pipeline.ts"),
      "clean",
      "otis",
      "--run-id",
      "otis-clean-v1",
      "--dry-run",
    ], { cwd: root, encoding: "utf8" });
    const parsed = JSON.parse(output) as {
      registryPath: string;
      dryRun: boolean;
    };

    expect(parsed.dryRun).toBe(true);
    expect(existsSync(join(root, parsed.registryPath))).toBe(false);
  });

  it("protects promoted Otis public art, manifests, browser QA, and final-board browser evidence on dry-run cleanup", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-clean-otis-evidence-"));
    const runId = "otis-real-rembg-full-production-v1";
    const browserQaPath = join(root, ".artlab/runs/otis", runId, "browser-qa/browser-qa.json");
    const finalBoardCheckPath = join(root, ".artlab/runs/otis", runId, "review/final-board-browser-check.png");
    const publicArtPath = join(root, "public/art/lobby/otis/regular/idle.webp");
    const manifestPath = join(root, "src/lib/visual-assets/approved-character-assets.generated.json");

    mkdirSync(join(browserQaPath, ".."), { recursive: true });
    mkdirSync(join(finalBoardCheckPath, ".."), { recursive: true });
    mkdirSync(join(publicArtPath, ".."), { recursive: true });
    mkdirSync(join(manifestPath, ".."), { recursive: true });
    writeFileSync(browserQaPath, "{}");
    writeFileSync(finalBoardCheckPath, "png");
    writeFileSync(publicArtPath, "webp");
    writeFileSync(manifestPath, "[]");

    const output = execFileSync(tsx, [
      join(process.cwd(), "scripts/art-pipeline.ts"),
      "clean",
      "otis",
      "--run-id",
      runId,
      "--dry-run",
    ], { cwd: root, encoding: "utf8" });
    const parsed = JSON.parse(output) as {
      cleanupPlan: {
        protected: string[];
        delete: string[];
      };
    };

    expect(parsed.cleanupPlan.protected).toEqual(expect.arrayContaining([
      `public/art/lobby/otis/`,
      "src/lib/visual-assets/approved-character-assets.generated.json",
      `.artlab/runs/otis/${runId}/browser-qa/browser-qa.json`,
      `.artlab/runs/otis/${runId}/review/final-board-browser-check.png`,
    ]));
    expect(parsed.cleanupPlan.delete).not.toContain(`.artlab/runs/otis/${runId}/browser-qa/browser-qa.json`);
    expect(parsed.cleanupPlan.delete).not.toContain(`.artlab/runs/otis/${runId}/review/final-board-browser-check.png`);
  });
});
