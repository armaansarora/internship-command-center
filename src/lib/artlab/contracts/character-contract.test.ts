// src/lib/artlab/contracts/character-contract.test.ts
import { describe, expect, it } from "vitest";
import {
  CHARACTER_MATRIX,
  CHARACTER_MATRIX_SLOT_COUNT,
  CharacterPoseManifestSchema,
  buildEmptyCharacterPoseManifest,
  characterContract,
  isCharacterMatrixComplete,
} from "./character-contract";

describe("character contract — 21-sprite matrix", () => {
  it("declares exactly 21 (7 poses × 3 expressions) required slots with unique ids", () => {
    expect(CHARACTER_MATRIX_SLOT_COUNT).toBe(21);
    expect(CHARACTER_MATRIX).toHaveLength(21);
    const ids = new Set(CHARACTER_MATRIX.map((slot) => slot.slotId));
    expect(ids.size).toBe(21);
    expect(CHARACTER_MATRIX.every((slot) => slot.required === true)).toBe(true);
  });

  it("isCharacterMatrixComplete recognises the full set and rejects partial sets", () => {
    const full = CHARACTER_MATRIX.map((slot) => slot.slotId);
    expect(isCharacterMatrixComplete(full)).toBe(true);
    expect(isCharacterMatrixComplete(full.slice(0, 20))).toBe(false);
    expect(isCharacterMatrixComplete([...full, "extra-slot"])).toBe(false);
  });

  it("CharacterPoseManifestSchema accepts a complete matrix and rejects partial manifests", () => {
    const entries = CHARACTER_MATRIX.map((slot) => ({
      slotId: slot.slotId,
      pose: slot.pose,
      expression: slot.expression,
      sourcePath: `runs/r1/source/${slot.slotId}.png`,
      transparentPngPath: `runs/r1/cutouts/${slot.slotId}.png`,
      width: 1024,
      height: 1024,
      alphaVerified: true,
    }));
    const ok = CharacterPoseManifestSchema.safeParse({
      schemaVersion: "tower-creative-production.character.v1",
      characterId: "ceo",
      runId: "r1",
      promotedAt: "2026-05-22T00:00:00.000Z",
      entries,
    });
    expect(ok.success).toBe(true);

    const partial = CharacterPoseManifestSchema.safeParse({
      schemaVersion: "tower-creative-production.character.v1",
      characterId: "ceo",
      runId: "r1",
      promotedAt: "2026-05-22T00:00:00.000Z",
      entries: entries.slice(0, 20),
    });
    expect(partial.success).toBe(false);
  });

  it("buildEmptyCharacterPoseManifest seeds the right header", () => {
    const draft = buildEmptyCharacterPoseManifest({ characterId: "mara", runId: "r2" });
    expect(draft.schemaVersion).toBe("tower-creative-production.character.v1");
    expect(draft.characterId).toBe("mara");
    expect(draft.runId).toBe("r2");
    expect(draft.entries).toEqual([]);
  });

  it("characterContract barrel exposes the matrix and the schema", () => {
    expect(characterContract.slotCount).toBe(21);
    expect(characterContract.matrix).toBe(CHARACTER_MATRIX);
    expect(characterContract.manifestSchema).toBe(CharacterPoseManifestSchema);
  });
});
