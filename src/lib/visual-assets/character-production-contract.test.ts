import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CHARACTER_OUTFIT_VARIANTS,
  CHARACTER_POSES,
  SEASON_ONE_CHARACTER_METADATA,
  getCharacterOutfitProductionDirectory,
  getCharacterProductionDirectory,
  getExpectedCharacterSpriteSlot,
  getExpectedCharacterSpriteSlots,
  getMissingApprovedCharacterSprites,
  getProductionSpriteSrc,
  toApprovedCharacterVisualAsset,
  VISUAL_ASSETS,
} from "@/lib/visual-assets";

describe("Season 1 character production contract", () => {
  it("defines exactly 252 deterministic production sprite slots", () => {
    const slots = getExpectedCharacterSpriteSlots();

    expect(SEASON_ONE_CHARACTER_METADATA).toHaveLength(12);
    expect(CHARACTER_OUTFIT_VARIANTS).toEqual([
      "regular",
      "summer-light",
      "winter-layered",
    ]);
    expect(CHARACTER_POSES).toEqual([
      "idle",
      "greeting",
      "listening",
      "thinking",
      "talking",
      "alert",
      "working",
    ]);
    expect(slots).toHaveLength(
      SEASON_ONE_CHARACTER_METADATA.length * CHARACTER_OUTFIT_VARIANTS.length * CHARACTER_POSES.length,
    );

    for (const character of SEASON_ONE_CHARACTER_METADATA) {
      expect(character.styleId).toBe("tower-flat-plus-depth-v1");
      expect(character.canonStatus).toBe("bible-approved");
      expect(character.assetStatus).toBe("awaiting-concept-approval");
      expect(character.visualArchetype.length).toBeGreaterThan(8);
      expect(character.silhouette.length).toBeGreaterThan(12);
      expect(character.wardrobe.length).toBeGreaterThan(12);
      expect(character.props.length).toBeGreaterThan(4);
      expect(character.mobileRead.length).toBeGreaterThan(8);
      expect(character.negativeDNA.length).toBeGreaterThan(12);
      expect(character.masterQuality).toBe("4k-source-approved");
      expect(Math.max(character.sourceFrame.width, character.sourceFrame.height)).toBeGreaterThanOrEqual(4096);
      expect(character.displayFrame.width).toBeGreaterThan(0);
      expect(character.displayFrame.height).toBeGreaterThan(0);
      expect(character.safePadding.top).toBeGreaterThanOrEqual(0);
      expect(character.safePadding.right).toBeGreaterThanOrEqual(0);
      expect(character.safePadding.bottom).toBeGreaterThanOrEqual(0);
      expect(character.safePadding.left).toBeGreaterThanOrEqual(0);
      expect(character.maxDisplayScale).toBeGreaterThanOrEqual(1);
      expect(character.motionProfile).toMatch(/^[a-z-]+$/);
      expect(character.artDirectionNotes.length).toBeGreaterThan(16);
      expect(character.conceptBoardPromptRef).toMatch(/^art-bible:[a-z0-9-]+-concept-board-v1$/);
      expect(character.posePackPromptRef).toMatch(/^art-bible:[a-z0-9-]+-pose-pack-v1$/);
      expect(getCharacterProductionDirectory(character.id)).toBe(
        `/art/${character.space}/${character.id}`,
      );

      for (const outfitVariant of CHARACTER_OUTFIT_VARIANTS) {
        expect(getCharacterOutfitProductionDirectory(character.id, outfitVariant)).toBe(
          `/art/${character.space}/${character.id}/${outfitVariant}`,
        );
        for (const pose of CHARACTER_POSES) {
          expect(getProductionSpriteSrc(character.id, pose, outfitVariant)).toBe(
            `/art/${character.space}/${character.id}/${outfitVariant}/${pose}.webp`,
          );
        }
      }
    }
  });

  it("prepares every future character asset with 4k master metadata and responsive renditions", () => {
    const slot = getExpectedCharacterSpriteSlot("otis", "talking", "winter-layered");

    expect(slot).toMatchObject({
      characterId: "otis",
      outfitVariant: "winter-layered",
      pose: "talking",
      src: "/art/lobby/otis/winter-layered/talking.webp",
      masterQuality: "4k-source-approved",
      motionProfile: "concierge-calm",
    });
    expect(Math.max(slot.sourceFrame.width, slot.sourceFrame.height)).toBeGreaterThanOrEqual(4096);
    expect(slot.displayFrame).toEqual({ width: 170, height: 290 });
    expect(slot.renditions).toEqual({
      default: {
        src: "/art/lobby/otis/winter-layered/talking.webp",
        width: 170,
        height: 290,
      },
      retina2x: {
        src: "/art/lobby/otis/winter-layered/talking@2x.webp",
        width: 340,
        height: 580,
      },
      retina3x: {
        src: "/art/lobby/otis/winter-layered/talking@3x.webp",
        width: 510,
        height: 870,
      },
    });

    const manifestEntry = toApprovedCharacterVisualAsset(slot);
    expect(manifestEntry.masterQuality).toBe("4k-source-approved");
    expect(manifestEntry.renditions?.retina3x.src).toBe(
      "/art/lobby/otis/winter-layered/talking@3x.webp",
    );
    expect(manifestEntry.displayFrame).toEqual(slot.displayFrame);
    expect(manifestEntry.safePadding).toEqual(slot.safePadding);
    expect(manifestEntry.maxDisplayScale).toBe(slot.maxDisplayScale);
    expect(manifestEntry.artDirectionNotes).toContain("Otis");
  });

  it("keeps prompt refs and handoff docs ready for the next image-generation pass", () => {
    const artBible = readFileSync(join(process.cwd(), "docs/ART-BIBLE.md"), "utf8");
    const promptPack = readFileSync(
      join(process.cwd(), "docs/CHARACTER-IMAGE-PROMPTS.md"),
      "utf8",
    );
    const pipeline = readFileSync(
      join(process.cwd(), "docs/CHARACTER-ART-PIPELINE.md"),
      "utf8",
    );
    const handoff = readFileSync(
      join(process.cwd(), "docs/CHARACTER-ASSET-HANDOFF.md"),
      "utf8",
    );

    for (const character of SEASON_ONE_CHARACTER_METADATA) {
      expect(artBible).toContain(character.promptRef);
      expect(artBible).toContain(character.conceptBoardPromptRef);
      expect(artBible).toContain(character.posePackPromptRef);
      expect(promptPack).toContain(`## ${character.displayName}`);
      expect(promptPack).toContain(`characterId: ${character.id}`);
      expect(promptPack).toContain(`Concept board prompt ref: ${character.conceptBoardPromptRef}`);
      expect(promptPack).toContain(`Pose pack prompt ref: ${character.posePackPromptRef}`);
      expect(handoff).toContain(getCharacterProductionDirectory(character.id));
    }
    for (const outfitVariant of CHARACTER_OUTFIT_VARIANTS) {
      expect(promptPack).toContain(outfitVariant);
      expect(handoff).toContain(outfitVariant);
    }
    expect(handoff).toContain("252 expected Season 1 character sprites");
    expect(promptPack).toContain("{outfitVariantName}");
    expect(promptPack).toContain("{outfitVariantDefinition}");
    expect(handoff).toContain("No Quality Compromise Gate");
    expect(handoff).toContain("4K transparent master");
    expect(handoff).toContain("prototype-reference");
    expect(handoff).toContain("pose@2x.webp");
    expect(handoff).toContain("pose@3x.webp");
    expect(handoff).toContain("dark-background preview");
    expect(handoff).toContain("approved for app");
    expect(pipeline).toContain("Quality cannot be negotiated downstream");
    expect(pipeline).toContain("source sheet fails");
    expect(pipeline).toContain("V1 talking is not lip sync");
    expect(pipeline).toContain("CharacterStage");
  });

  it("reports only unapproved character sprites as missing after Otis promotion", () => {
    const missing = getMissingApprovedCharacterSprites(VISUAL_ASSETS);

    expect(missing).toHaveLength(231);
    expect(missing.some((slot) => slot.characterId === "otis")).toBe(false);
    expect(missing[0]).toMatchObject({
      characterId: "ceo",
      outfitVariant: "regular",
      pose: "idle",
      src: "/art/penthouse/ceo/regular/idle.webp",
      promptRef: "art-bible:mara-voss-pose-pack-v1",
    });
  });
});
