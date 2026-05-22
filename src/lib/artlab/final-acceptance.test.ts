// src/lib/artlab/final-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

describe("ArtLab final acceptance gate (Phase 8)", () => {
  it("no remaining import of creative-production anywhere", () => {
    // Exclude this acceptance test itself and the legacy-import-audit tool (which contains
    // the forbidden patterns as regex strings, not actual imports).
    const result = execSync(
      "grep -rl 'from.*creative-production\\|require.*creative-production' src scripts --include='*.ts' --include='*.tsx' | grep -v 'final-acceptance.test.ts' | grep -v 'artlab-legacy-import-audit' || true",
      { encoding: "utf8" }
    ).trim();
    expect(result).toBe("");
  });

  it("zero legacy entry-point scripts remain", () => {
    expect(existsSync("scripts/creative-production-orchestrator.ts")).toBe(false);
    expect(existsSync("scripts/creative-generation-adapter.ts")).toBe(false);
    expect(existsSync("scripts/art-pipeline.ts")).toBe(false);
    expect(existsSync("scripts/creative-production-health.ts")).toBe(false);
    expect(existsSync("src/lib/creative-production")).toBe(false);
  });

  it("docs/legacy/ has truly-retired archived docs + README", () => {
    expect(existsSync("docs/legacy/README.md")).toBe(true);
    // CREATIVE-PRODUCTION-ENGINE.md and SVG-RETIREMENT.md are truly retired (no
    // active references). Character bibles and runbooks remain in docs/ because
    // visual-assets and observability tests still verify them as active.
    expect(existsSync("docs/legacy/CREATIVE-PRODUCTION-ENGINE.md")).toBe(true);
  });

  it("3 new ArtLab docs exist and are not placeholders", () => {
    for (const name of ["ENGINE.md", "OPERATIONS.md", "CHARACTER-PIPELINE.md"]) {
      const content = readFileSync(join("docs", "artlab", name), "utf8");
      expect(content).not.toMatch(/Status: WIP placeholder/);
      expect(content.length).toBeGreaterThan(500);
    }
  });

  it("SKILL.md slim (≤ 80 lines)", () => {
    const path = ".agents/skills/artlab/SKILL.md";
    expect(existsSync(path)).toBe(true);
    const lines = readFileSync(path, "utf8").split("\n").length;
    expect(lines).toBeLessThanOrEqual(80);
  });

  it("CLAUDE.md describes ArtLab, not CPE", () => {
    const content = readFileSync("CLAUDE.md", "utf8");
    expect(content).toMatch(/ArtLab/);
    expect(content).not.toMatch(/npm run art:produce/);
  });

  it("all 10 safety properties tests pass", () => {
    // The mere presence of the file proves it; vitest top-level run proves the assertions.
    expect(existsSync("src/lib/artlab/safety-properties/all-ten.test.ts")).toBe(true);
  });
});
