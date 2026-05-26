// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SpriteSheetPlayer } from "./sprite-sheet-player";

describe("SpriteSheetPlayer", () => {
  it("renders an <img> referencing the sheet path", () => {
    const html = renderToStaticMarkup(<SpriteSheetPlayer sheet="/art/sprites/test.png" fps={24} loop />);
    expect(html).toContain("/art/sprites/test.png");
  });

  it("sets aria-label when caller passes one", () => {
    const html = renderToStaticMarkup(<SpriteSheetPlayer sheet="/art/sprites/x.png" fps={12} loop aria-label="Sol idle" />);
    expect(html).toMatch(/aria-label="Sol idle"/);
  });

  it("emits role='img' so screen readers can target it", () => {
    const html = renderToStaticMarkup(<SpriteSheetPlayer sheet="/art/sprites/x.png" fps={12} loop />);
    expect(html).toMatch(/role="img"/);
  });
});
