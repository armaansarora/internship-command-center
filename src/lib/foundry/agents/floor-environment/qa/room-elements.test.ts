import { describe, expect, it } from "vitest";
import { verifyFoundryFloorRoomElements } from "./room-elements";

describe("verifyFoundryFloorRoomElements", () => {
  it("passes when the LLM-reported elements cover the required set", () => {
    const result = verifyFoundryFloorRoomElements({
      required: ["wall-mounted-boards", "leather-chairs", "globe"],
      reported: ["wall-mounted-boards", "leather-chairs", "globe", "lamp"],
    });
    expect(result.passed).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("fails when any required element is missing", () => {
    const result = verifyFoundryFloorRoomElements({
      required: ["wall-mounted-boards", "leather-chairs", "globe"],
      reported: ["wall-mounted-boards", "lamp"],
    });
    expect(result.passed).toBe(false);
    expect([...result.missing].sort()).toEqual(["globe", "leather-chairs"]);
  });

  it("normalises case and dashes when matching", () => {
    const result = verifyFoundryFloorRoomElements({
      required: ["Wall-Mounted Boards", "Globe"],
      reported: ["wall mounted boards", "globe"],
    });
    expect(result.passed).toBe(true);
  });

  it("rejects empty required list (canon-entry-as-a-bug)", () => {
    expect(() =>
      verifyFoundryFloorRoomElements({ required: [], reported: ["x"] }),
    ).toThrow(/required/i);
  });
});
