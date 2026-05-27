import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CLAUDE = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");

describe("CLAUDE.md mentions the ArtLab SDK", () => {
  it("contains a 'ArtLab SDK' heading or paragraph", () => {
    expect(CLAUDE).toMatch(/ArtLab SDK/);
  });

  it("pins the brand convention rule from CLAUDE.md line 62 (forbids 'Foundry' and 'Tower Art Foundry', permits the artlab/sdk/ qualifier)", () => {
    // The rule must be documented as a single bullet that names BOTH forbidden
    // variants AND the permitted qualifier. Asserting all three signals appear
    // in the same line guarantees the brand convention is actually written down,
    // not just incidentally satisfied by a path mention elsewhere in the file.
    const lines = CLAUDE.split("\n");
    const ruleLine = lines.find(
      (line) =>
        line.includes('"Foundry"') &&
        line.includes('"Tower Art Foundry"') &&
        line.includes("`artlab/sdk/`"),
    );
    expect(
      ruleLine,
      'CLAUDE.md must contain a single bullet that names "Foundry" and "Tower Art Foundry" as forbidden and `artlab/sdk/` as the permitted qualifier',
    ).toBeDefined();
  });

  it("links to docs/artlab/sdk/ (folder exists)", () => {
    expect(existsSync(join(ROOT, "docs", "artlab", "sdk"))).toBe(true);
  });

  it("retains the existing 'ArtLab' engine pointer (engine and SDK coexist)", () => {
    expect(CLAUDE).toMatch(/ArtLab/);
  });
});
