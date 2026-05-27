import { describe, expect, it } from "vitest";
import {
  renderArtLabSpriteIntegrationSnippet,
  renderArtLabLottieIntegrationSnippet,
} from "./integration";

describe("renderArtLabSpriteIntegrationSnippet", () => {
  it("emits an <AnimatedSprite> component reference", () => {
    const out = renderArtLabSpriteIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: ".artlab/sdk/packs/sprite-otis-idle",
      fps: 12,
      loops: true,
    });
    expect(out).toContain("<AnimatedSprite");
    expect(out).toContain('pack="otis-idle"');
  });

  it("emits the import from the ArtLab SDK components root", () => {
    const out = renderArtLabSpriteIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: "x",
      fps: 12,
      loops: true,
    });
    expect(out).toContain('from "@/components/artlab/animated-sprite"');
  });

  it("documents fps and loops as comments", () => {
    const out = renderArtLabSpriteIntegrationSnippet({
      characterId: "otis",
      action: "wave",
      packPath: "x",
      fps: 24,
      loops: false,
    });
    expect(out).toContain("24");
    expect(out).toContain("loops=false");
  });
});

describe("renderArtLabLottieIntegrationSnippet", () => {
  it("emits a <LottieAnimation> component import + JSX", () => {
    const out = renderArtLabLottieIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: ".artlab/sdk/packs/lottie-otis-idle",
      lottiePath: "lottie.json",
      durationMs: 1000,
    });
    expect(out).toContain("<LottieAnimation");
    expect(out).toContain('src="lottie.json"');
  });

  it("declares the GSAP timeline duration as a comment", () => {
    const out = renderArtLabLottieIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: "x",
      lottiePath: "lottie.json",
      durationMs: 1234,
    });
    expect(out).toContain("1234");
  });
});
