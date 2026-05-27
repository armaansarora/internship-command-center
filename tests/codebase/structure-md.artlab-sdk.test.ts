import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STRUCTURE = readFileSync(join(process.cwd(), "STRUCTURE.md"), "utf8");

describe("STRUCTURE.md mentions the ArtLab SDK tree", () => {
  it("contains a 'ArtLab SDK' heading", () => {
    expect(STRUCTURE).toMatch(/ArtLab SDK/);
  });

  it("documents src/lib/artlab/sdk/mcp/", () => {
    expect(STRUCTURE).toMatch(/src\/lib\/artlab\/sdk\/mcp/);
  });

  it("documents src/lib/artlab/sdk/brain/", () => {
    expect(STRUCTURE).toMatch(/src\/lib\/artlab\/sdk\/brain/);
  });

  it("documents scripts/artlab-sdk-mcp.ts", () => {
    expect(STRUCTURE).toMatch(/scripts\/artlab-sdk-mcp\.ts/);
  });
});
