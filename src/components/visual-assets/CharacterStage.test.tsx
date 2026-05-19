import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterStage } from "./CharacterStage";

describe("CharacterStage", () => {
  it("maps talking state to the talking pose and the character motion profile", () => {
    const html = renderToStaticMarkup(
      <CharacterStage
        characterId="otis"
        state="talking"
        aria-label="Otis is speaking"
        reducedMotionOverride={false}
      />,
    );

    expect(html).toContain('data-character="otis"');
    expect(html).toContain('data-character-state="talking"');
    expect(html).toContain('data-character-pose="talking"');
	    expect(html).toContain('data-character-motion-profile="concierge-calm"');
	    expect(html).toContain('data-visual-stage-shadow="grounded-premium"');
	    expect(html).toContain("tower-visual-asset-stage__shadow");
	    expect(html).toContain("tower-character-stage-talk");
  });

  it("freezes motion for reduced-motion users without losing state or pose", () => {
    const html = renderToStaticMarkup(
      <CharacterStage
        characterId="otis"
        state="listening"
        aria-label="Otis is listening"
        reducedMotionOverride
      />,
    );

    expect(html).toContain('data-character-state="listening"');
    expect(html).toContain('data-character-pose="listening"');
    expect(html).toContain('data-reduced-motion="true"');
    expect(html).toMatch(/^<div[^>]*class=""/);
  });
});
