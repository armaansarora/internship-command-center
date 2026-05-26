import { describe, expect, it } from "vitest";
import { renderArtLabFloorIntegrationSnippet } from "./integration";

describe("renderArtLabFloorIntegrationSnippet", () => {
  it("renders an import line for the FloorBackground component", () => {
    const out = renderArtLabFloorIntegrationSnippet({
      floorSlug: "war-room",
      packPath: ".foundry/packs/floor-war-room",
    });
    expect(out).toContain("import { FloorBackground }");
    expect(out).toContain("@/components/artlab/floor-background");
  });

  it("renders the JSX block with the floor prop", () => {
    const out = renderArtLabFloorIntegrationSnippet({
      floorSlug: "war-room",
      packPath: ".foundry/packs/floor-war-room",
    });
    expect(out).toContain('<FloorBackground floor="war-room" />');
  });

  it("includes the pack path as a comment for the wiring agent", () => {
    const out = renderArtLabFloorIntegrationSnippet({
      floorSlug: "war-room",
      packPath: ".foundry/packs/floor-war-room",
    });
    expect(out).toContain(".foundry/packs/floor-war-room");
  });

  it("renders deterministically for identical inputs", () => {
    const a = renderArtLabFloorIntegrationSnippet({
      floorSlug: "rolodex-lounge",
      packPath: ".foundry/packs/floor-rolodex-lounge",
    });
    const b = renderArtLabFloorIntegrationSnippet({
      floorSlug: "rolodex-lounge",
      packPath: ".foundry/packs/floor-rolodex-lounge",
    });
    expect(a).toBe(b);
  });
});
