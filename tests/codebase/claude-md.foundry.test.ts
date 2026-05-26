import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CLAUDE = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");

describe("CLAUDE.md mentions the Tower Art Foundry SDK", () => {
  it("contains a 'Tower Art Foundry' heading or paragraph", () => {
    expect(CLAUDE).toMatch(/Tower Art Foundry/);
  });

  it("references the MCP server identity", () => {
    expect(CLAUDE).toMatch(/tower-art-foundry/);
  });

  it("links to docs/foundry/ (folder exists)", () => {
    expect(existsSync(join(ROOT, "docs", "foundry"))).toBe(true);
  });

  it("retains the existing 'ArtLab' engine pointer (engine and SDK coexist)", () => {
    expect(CLAUDE).toMatch(/ArtLab/);
  });
});
