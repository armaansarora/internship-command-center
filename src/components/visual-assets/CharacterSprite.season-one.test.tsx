import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SEASON_ONE_CHARACTER_METADATA } from "@/lib/visual-assets";
import { AgentCharacterButton } from "./AgentCharacterButton";
import { CharacterSprite } from "./CharacterSprite";

describe("CharacterSprite Season 1 fallback", () => {
  it("renders every canonical Season 1 character without undefined labels or accents", () => {
    for (const character of SEASON_ONE_CHARACTER_METADATA) {
      const html = renderToStaticMarkup(
        <CharacterSprite
          characterId={character.id}
          pose="idle"
          aria-label={`${character.displayName} idle`}
        />,
      );

      expect(html).toContain(`data-visual-asset-fallback="${character.id}"`);
      expect(html).toContain(character.shortLabel);
      expect(html).toContain(`data-character-outfit="regular"`);
      expect(html).not.toContain("undefined");
    }
  });

  it("can request seasonal outfit variants before approved art exists", () => {
    const html = renderToStaticMarkup(
      <CharacterSprite
        characterId="ceo"
        pose="idle"
        outfitVariant="winter-layered"
        aria-label="Mara winter idle"
      />,
    );

    expect(html).toContain(`data-visual-asset-fallback="ceo"`);
    expect(html).toContain(`data-character-outfit="winter-layered"`);
    expect(html).toContain(`data-character-pose="idle"`);
  });

  it("lets agent buttons fall back to canonical character metadata", () => {
    const html = renderToStaticMarkup(
      <AgentCharacterButton
        characterId="trust"
        state="alert"
        label="Etta Knox alert"
        idleLabel="Etta"
        activeLabel="Reviewing"
        isOpen={false}
        onClick={() => undefined}
        onMouseEnter={() => undefined}
        onMouseLeave={() => undefined}
      />,
    );

    expect(html).toContain("Etta Knox alert");
    expect(html).toContain("Reviewing");
    expect(html).toContain("#9E3F4F");
    expect(html).not.toContain("undefined");
  });
});
