import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CLAUDE = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");

describe("CLAUDE.md mentions the ArtLab SDK", () => {
  it("contains a 'ArtLab SDK' heading or paragraph", () => {
    expect(CLAUDE).toMatch(/ArtLab SDK/);
  });

  it("references the MCP server identity", () => {
    expect(CLAUDE).toMatch(/artlab/);
  });

  it("links to docs/artlab/sdk/ (folder exists)", () => {
    expect(existsSync(join(ROOT, "docs", "artlab", "sdk"))).toBe(true);
  });

  it("retains the existing 'ArtLab' engine pointer (engine and SDK coexist)", () => {
    expect(CLAUDE).toMatch(/ArtLab/);
  });
});
