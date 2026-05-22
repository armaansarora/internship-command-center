import { describe, expect, it } from "vitest";
import { ARTLAB_RUNNERS, getRunner } from "./index";
import { animationRunner } from "./animation-runner";
import { environmentRunner } from "./environment-runner";
import { uiTextureRunner } from "./ui-texture-runner";
import { productionRunner } from "./production-runner";

describe("runner registry", () => {
  it("exposes all 7 runner kinds", () => {
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

  it("getRunner('production', assetType) dispatches to the asset-aware runner when one exists", () => {
    expect(getRunner("production", "animation")).toBe(animationRunner);
    expect(getRunner("production", "environment")).toBe(environmentRunner);
    expect(getRunner("production", "ui-texture")).toBe(uiTextureRunner);
  });

  it("getRunner('production', characterOrOther) falls back to the generic productionRunner", () => {
    expect(getRunner("production", "character")).toBe(productionRunner);
    expect(getRunner("production", "prop")).toBe(productionRunner);
    expect(getRunner("production", "scene")).toBe(productionRunner);
    expect(getRunner("production")).toBe(productionRunner);
  });
});
