import { describe, expect, it } from "vitest";
import { ARTLAB_PHASES, ARTLAB_BLOCKERS, ARTLAB_WORKSPACE_RELATIVE } from "./index";

describe("artlab public surface", () => {
  it("re-exports phase enum", () => {
    expect(ARTLAB_PHASES.length).toBe(13);
  });
  it("re-exports blocker enum", () => {
    expect(ARTLAB_BLOCKERS.length).toBe(8);
  });
  it("exports workspace path constant", () => {
    expect(ARTLAB_WORKSPACE_RELATIVE).toBe(".artlab/engine");
  });
});
