import { describe, expect, it } from "vitest";
import { FLOORS } from "@/types/ui";
import { FLOOR_IDENTITY, getFloorIdentity } from "./floor-identity";
import { AMBIENT_BED_BY_FLOOR } from "@/lib/sound/engine";

describe("FLOOR_IDENTITY", () => {
  it("covers every floor in FLOORS", () => {
    for (const f of FLOORS) {
      expect(FLOOR_IDENTITY[f.id]).toBeDefined();
      expect(FLOOR_IDENTITY[f.id].name).toBe(f.name);
    }
  });

  it("getFloorIdentity falls back to Penthouse for unknown ids", () => {
    expect(getFloorIdentity(undefined).name).toBe("The Penthouse");
    expect(getFloorIdentity(null).name).toBe("The Penthouse");
  });

  it("aligns the character on each floor with FLOORS[].character", () => {
    for (const f of FLOORS) {
      if (!f.character) continue;
      // Penthouse intentionally has no in-room character — the floor IS the
      // vista. The CEO's station is the C-Suite (floor 1). FLOORS[].character
      // models "who runs this surface" (CEO runs the Penthouse dashboard) but
      // FLOOR_IDENTITY models "who is physically standing on this floor."
      if (f.id === "PH") {
        expect(FLOOR_IDENTITY.PH.characterId).toBeNull();
        continue;
      }
      // The Lobby's concierge has a proper name (Otis) per the Lobby
      // primitives. FLOORS[].character is the generic role label
      // ("Concierge"); FLOOR_IDENTITY uses the named character so the
      // presence ribbon reads "Otis is at the reception desk." rather
      // than "Concierge is at the reception desk."
      if (f.id === "L") {
        expect(FLOOR_IDENTITY.L.characterId).toBe("Otis");
        continue;
      }
      expect(FLOOR_IDENTITY[f.id].characterId).toBe(f.character);
    }
  });

  it("keeps the ambient bed mapping consistent with the identity table", () => {
    // Every floor in the ambient mapping must exist in FLOOR_IDENTITY,
    // and the only floor intentionally missing a bed is the Lobby.
    for (const id of Object.keys(AMBIENT_BED_BY_FLOOR)) {
      expect(FLOOR_IDENTITY[id as keyof typeof FLOOR_IDENTITY]).toBeDefined();
    }
    expect(AMBIENT_BED_BY_FLOOR.L).toBeUndefined();
  });
});
