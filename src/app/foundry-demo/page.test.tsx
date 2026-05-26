// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FoundryDemoPage from "./page";

describe("FoundryDemoPage", () => {
  it("renders one of each demo modality (character/floor/icon/sprite)", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    expect(html).toContain("/art/characters/rafe-calder.png");
    expect(html).toContain("/art/floors/war-room-dusk.webp");
    expect(html).toContain("/art/icons/elevator-chevron.svg");
    expect(html).toContain("/art/sprites/sol-navarro-idle.png");
  });

  it("each demo section carries an aria-label or visible heading", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    expect(html).toMatch(/Character/);
    expect(html).toMatch(/Floor/);
    expect(html).toMatch(/Icon/);
    expect(html).toMatch(/Sprite/);
  });

  it("page title includes the words 'Tower Art Foundry'", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    expect(html).toMatch(/Tower Art Foundry/);
  });
});
