import { describe, expect, it } from "vitest";
import {
  FOUNDRY_ASSET_KINDS,
  FOUNDRY_ASSET_PACK_VERSION,
  FOUNDRY_AGENT_KINDS,
} from "./constants";

describe("asset pack constants", () => {
  it("lists every asset kind the foundry can produce", () => {
    expect(FOUNDRY_ASSET_KINDS).toEqual([
      "character-sprite",
      "character-spritesheet",
      "floor-environment",
      "ui-texture",
      "ui-icon",
      "sprite-animation",
      "motion-design",
      "video",
      "sound",
    ]);
  });

  it("declares the manifest schema version", () => {
    expect(FOUNDRY_ASSET_PACK_VERSION).toBe("1.0.0");
  });

  it("lists every specialist agent kind", () => {
    expect(FOUNDRY_AGENT_KINDS).toEqual([
      "character-master",
      "floor-environment",
      "ui-texture",
      "ui-icon",
      "sprite-animator",
      "motion-designer",
      "video-director",
      "sound-designer",
    ]);
  });
});
