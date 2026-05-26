// src/lib/foundry/agents/ui-texture/integration.test.ts
import { describe, expect, it } from "vitest";
import {
  renderFoundryIconIntegrationSnippet,
  renderFoundryTextureIntegrationSnippet,
} from "./integration";

describe("renderFoundryIconIntegrationSnippet", () => {
  it("emits a React-style component import for the icon", () => {
    const out = renderFoundryIconIntegrationSnippet({
      name: "elevator-door",
      packPath: ".foundry/packs/icon-elevator-door",
    });
    expect(out).toContain(
      'import { ElevatorDoorIcon } from "@/components/artlab/icons/elevator-door";',
    );
  });

  it("includes the pack path as a comment", () => {
    const out = renderFoundryIconIntegrationSnippet({
      name: "elevator-door",
      packPath: ".foundry/packs/icon-elevator-door",
    });
    expect(out).toContain(".foundry/packs/icon-elevator-door");
  });

  it("converts dashed names to PascalCase component names", () => {
    const out = renderFoundryIconIntegrationSnippet({
      name: "elevator-door",
      packPath: "x",
    });
    expect(out).toContain("ElevatorDoorIcon");
  });
});

describe("renderFoundryTextureIntegrationSnippet", () => {
  it("emits a Tailwind background-image block referencing the PNG", () => {
    const out = renderFoundryTextureIntegrationSnippet({
      name: "etched-gold-border",
      pngPath: "etched-gold-border.png",
      normalMapPath: "etched-gold-border.normal.png",
      tileMode: "repeat",
    });
    expect(out).toContain('bg-[url(');
    expect(out).toContain("etched-gold-border.png");
  });

  it("emits a CSS variable for the normal map", () => {
    const out = renderFoundryTextureIntegrationSnippet({
      name: "etched-gold-border",
      pngPath: "etched-gold-border.png",
      normalMapPath: "etched-gold-border.normal.png",
      tileMode: "repeat",
    });
    expect(out).toContain("--foundry-normal-map");
    expect(out).toContain("etched-gold-border.normal.png");
  });

  it("documents the tile mode in a comment", () => {
    const out = renderFoundryTextureIntegrationSnippet({
      name: "x",
      pngPath: "x.png",
      normalMapPath: "x.normal.png",
      tileMode: "repeat-x",
    });
    expect(out).toContain("repeat-x");
  });
});
