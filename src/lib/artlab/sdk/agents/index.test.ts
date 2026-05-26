import { describe, expect, it } from "vitest";
import * as agents from "./index";

describe("artlab sdk agents public surface", () => {
  it("exports runCharacterMaster", () => {
    expect(typeof agents.runCharacterMaster).toBe("function");
  });
  it("exports the stage constants and types module", () => {
    expect(Array.isArray(agents.CHARACTER_MASTER_STAGES)).toBe(true);
    expect(agents.CHARACTER_MASTER_STAGES.length).toBe(6);
  });
});
