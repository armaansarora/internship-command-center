import { describe, expect, it } from "vitest";
import {
  CHARACTER_MASTER_STAGES,
  CharacterMasterInputSchema,
  CharacterMasterStageSchema,
} from "./types";

describe("character-master types", () => {
  it("declares the canonical stage order", () => {
    expect(CHARACTER_MASTER_STAGES).toEqual([
      "concept-board",
      "anchor-lock",
      "variant-fan-out",
      "cutout-and-feather",
      "composite-judge",
      "manifest-build",
    ]);
  });

  it("accepts a minimal valid input", () => {
    expect(() =>
      CharacterMasterInputSchema.parse({
        characterId: "sol-navarro",
        canonRoot: "/abs/path/to/docs/foundry/canon",
        workspaceRoot: "/abs/path/to/.artlab/engine",
        providerId: "mock-foundry-image",
        resumeFromStage: null,
      }),
    ).not.toThrow();
  });

  it("rejects unknown resume stage", () => {
    expect(() =>
      CharacterMasterInputSchema.parse({
        characterId: "x",
        canonRoot: "/x",
        workspaceRoot: "/x",
        providerId: "mock-foundry-image",
        resumeFromStage: "rogue",
      }),
    ).toThrow();
  });
});
