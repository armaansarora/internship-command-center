import { describe, expect, it } from "vitest";
import { ARTLAB_RUNNERS, getRunner } from "./index";

describe("runner registry", () => {
  it("exposes all 7 runners", () => {
    expect(Object.keys(ARTLAB_RUNNERS).sort()).toEqual([
      "canary",
      "concept",
      "cutout",
      "production",
      "promotion",
      "strict-qa",
      "verifying",
    ]);
  });
  it("getRunner returns runner by kind", () => {
    expect(getRunner("concept").kind).toBe("concept");
  });
});
