import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STRUCTURE = readFileSync(join(process.cwd(), "STRUCTURE.md"), "utf8");

describe("STRUCTURE.md mentions the ArtLab SDK tree", () => {
  it("contains a real 'ArtLab SDK' markdown heading (not just an incidental mention)", () => {
    // Pin the actual section header, not any occurrence of the substring.
    // STRUCTURE.md documents the SDK tree under its own heading; an
    // unanchored /ArtLab SDK/ match would pass even if the section was
    // demolished and "ArtLab SDK" appeared only as prose elsewhere.
    expect(STRUCTURE).toMatch(/^#{1,6}\s+ArtLab SDK\s*$/m);
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
