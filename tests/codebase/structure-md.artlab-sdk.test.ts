import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STRUCTURE = readFileSync(join(process.cwd(), "STRUCTURE.md"), "utf8");

describe("STRUCTURE.md mentions the ArtLab SDK tree", () => {
  it("contains a 'ArtLab SDK' heading", () => {
    expect(STRUCTURE).toMatch(/ArtLab SDK|Tower Art Foundry SDK/);
  });

  it("documents src/lib/foundry/mcp/", () => {
    expect(STRUCTURE).toMatch(/src\/lib\/foundry\/mcp/);
  });

  it("documents src/lib/foundry/brain/", () => {
    expect(STRUCTURE).toMatch(/src\/lib\/foundry\/brain/);
  });

  it("documents scripts/artlab-sdk-mcp.ts", () => {
    expect(STRUCTURE).toMatch(/scripts\/foundry-mcp\.ts/);
  });
});
