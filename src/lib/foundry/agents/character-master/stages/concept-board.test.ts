import { describe, expect, it } from "vitest";
import { runConceptBoardStage } from "./concept-board";
import { createMockFoundryImageProvider } from "@/lib/foundry/providers/mock-provider";
import type { FoundryCharacterCanon } from "@/lib/foundry/canon";

const SOL: FoundryCharacterCanon = {
  header: { kind: "character", schemaVersion: "1.0.0", id: "sol-navarro", revisedAt: "2026-05-25T00:00:00.000Z" },
  displayName: "Sol Navarro",
  shortLabel: "Sol",
  title: "Chief Networking Officer",
  floorId: "rolodex-lounge",
  floorLabel: "Floor 6 — The Rolodex Lounge",
  styleEnvelope: "tower-flat-plus-depth-v1",
  visualArchetype: "warm-precise-relationship-curator",
  silhouette: "compact-shoulder-line, controlled-hair-volume, contact-card-prop",
  wardrobe: "neutral-blazer, soft-collared-blouse, subtle-jewelry",
  props: ["contact-card", "felt-tip-pen"],
  mobileRead: "warm-eyes-first, hand-prop-second, posture-third",
  negativeDNA: "no-sales-energy, no-toothy-grin, no-loud-color",
  accent: "burnt-orange-pocket-square",
  doctrine: "every-relationship-deserves-attention",
  flaw: "over-commits-emotionally",
  secretStrength: "remembers-everything",
  wound: "betrayed-by-a-mentor",
  outfitVariants: ["regular", "summer-light", "winter-layered"],
  poseStates: ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"],
  promotionStatus: "queued",
  paletteRef: "tower-default",
  motionProfile: "networking-warm",
  artDirectionNotes: "x",
};

describe("concept-board stage", () => {
  it("emits exactly 5 concept lanes", async () => {
    const provider = createMockFoundryImageProvider();
    const result = await runConceptBoardStage({ character: SOL, provider, seed: 42 });
    expect(result.lanes.length).toBe(5);
  });

  it("each lane has a distinct variation axis", async () => {
    const provider = createMockFoundryImageProvider();
    const result = await runConceptBoardStage({ character: SOL, provider });
    const axes = new Set(result.lanes.map((l) => l.variationAxis));
    expect(axes.size).toBe(5);
  });

  it("each lane references the canonical character id", async () => {
    const provider = createMockFoundryImageProvider();
    const result = await runConceptBoardStage({ character: SOL, provider });
    for (const lane of result.lanes) {
      expect(lane.characterId).toBe("sol-navarro");
      expect(lane.bytes.length).toBeGreaterThan(0);
    }
  });

  it("returns a stage duration", async () => {
    const provider = createMockFoundryImageProvider();
    const result = await runConceptBoardStage({ character: SOL, provider });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
