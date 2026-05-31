import { describe, it, expect } from "vitest";

import {
  FLOORS,
  FloorsSchema,
  getFloor,
  LOBBY_FLOOR,
  type FloorId,
} from "./floors.config";

describe("floors.config", () => {
  it("has exactly 9 floors that satisfy the schema", () => {
    expect(() => FloorsSchema.parse(FLOORS)).not.toThrow();
    expect(FLOORS).toHaveLength(9);
  });

  it("covers the building directory with unique ids", () => {
    const ids = FLOORS.map((f) => f.id);
    expect(new Set(ids).size).toBe(9);
    expect(ids).toEqual(
      expect.arrayContaining<FloorId>(["PH", "7", "6", "5", "4", "3", "2", "1", "L"]),
    );
  });

  it("uses a valid 6-digit hex accent on every floor", () => {
    for (const f of FLOORS) {
      expect(f.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("makes the Lobby the canonical cream mark", () => {
    expect(LOBBY_FLOOR.id).toBe("L");
    expect(LOBBY_FLOOR.accent.toUpperCase()).toBe("#F5F1E8");
  });

  it("resolves known floors and falls back to the Lobby for unknown ids", () => {
    expect(getFloor("7").name).toBe("The War Room");
    // Unknown id at runtime resolves to the Lobby (fail-safe).
    expect(getFloor("ZZ" as FloorId).id).toBe("L");
  });
});
