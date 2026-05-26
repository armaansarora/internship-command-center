import { describe, expect, it } from "vitest";
import {
  FOUNDRY_SLOT_REGISTRY,
  isFoundrySlotRegistered,
  resolveFoundrySlot,
  registerFoundrySlot,
} from "./slot-registry";

describe("FOUNDRY_SLOT_REGISTRY", () => {
  it("contains the Otis lobby slot", () => {
    expect(FOUNDRY_SLOT_REGISTRY.some((s) => s.slotId === "lobby/otis/regular/idle")).toBe(true);
  });

  it("contains a slot pattern for every promoted character outfit+pose", () => {
    const characterSlots = FOUNDRY_SLOT_REGISTRY.filter((s) => s.kind === "character-sprite");
    expect(characterSlots.length).toBeGreaterThanOrEqual(42);
  });

  it("isFoundrySlotRegistered returns true for a known slot", () => {
    expect(isFoundrySlotRegistered("lobby/otis/regular/idle")).toBe(true);
  });

  it("isFoundrySlotRegistered returns false for a rogue slot", () => {
    expect(isFoundrySlotRegistered("lobby/intruder/rogue")).toBe(false);
  });

  it("resolveFoundrySlot returns the slot record", () => {
    const slot = resolveFoundrySlot("lobby/otis/regular/idle");
    expect(slot?.appPath).toBe("public/art/lobby/otis/regular/idle.webp");
    expect(slot?.kind).toBe("character-sprite");
  });

  it("registerFoundrySlot adds a new dynamic slot", () => {
    registerFoundrySlot({
      slotId: "floors/7/background/main",
      appPath: "public/floors/7/background/main.webp",
      kind: "floor-environment",
      component: "WarRoomBackground",
      requiresGsap: true,
    });
    expect(isFoundrySlotRegistered("floors/7/background/main")).toBe(true);
  });

  it("registerFoundrySlot rejects a duplicate slot id", () => {
    expect(() =>
      registerFoundrySlot({
        slotId: "lobby/otis/regular/idle",
        appPath: "public/art/lobby/otis/regular/idle.webp",
        kind: "character-sprite",
        component: "OtisCharacter",
        requiresGsap: false,
      }),
    ).toThrow();
  });
});
