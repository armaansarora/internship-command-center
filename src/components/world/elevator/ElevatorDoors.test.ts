import { describe, expect, it } from "vitest";
import { deriveTravelDirection, floorDisplayName } from "./ElevatorDoors";

describe("deriveTravelDirection", () => {
  it("returns 'up' when moving from a lower floor to a higher floor", () => {
    expect(deriveTravelDirection("L", "PH")).toBe("up");
    expect(deriveTravelDirection("4", "7")).toBe("up");
    expect(deriveTravelDirection("1", "2")).toBe("up");
  });

  it("returns 'down' when moving from a higher floor to a lower floor", () => {
    expect(deriveTravelDirection("PH", "L")).toBe("down");
    expect(deriveTravelDirection("7", "4")).toBe("down");
    expect(deriveTravelDirection("2", "1")).toBe("down");
  });

  it("returns 'idle' when source and target are identical", () => {
    expect(deriveTravelDirection("PH", "PH")).toBe("idle");
    expect(deriveTravelDirection("L", "L")).toBe("idle");
  });
});

describe("floorDisplayName", () => {
  it("strips the leading 'The ' so the elevator caption stays compact", () => {
    expect(floorDisplayName("PH")).toBe("Penthouse");
    expect(floorDisplayName("7")).toBe("War Room");
    expect(floorDisplayName("L")).toBe("Lobby");
  });

  it("falls back to the raw id when the floor is unknown", () => {
    expect(floorDisplayName("ZZ")).toBe("ZZ");
  });
});
