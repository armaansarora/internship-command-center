import { describe, expect, it } from "vitest";
import {
  ARTLAB_ASSET_KINDS,
  ARTLAB_ASSET_PACK_VERSION,
  ARTLAB_AGENT_KINDS,
} from "./constants";

describe("asset pack constants", () => {
  it("lists every asset kind the ArtLab SDK can produce", () => {
    expect(ARTLAB_ASSET_KINDS).toEqual([
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
    expect(ARTLAB_ASSET_PACK_VERSION).toBe("1.0.0");
  });

  it("lists every specialist agent kind", () => {
    expect(ARTLAB_AGENT_KINDS).toEqual([
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
