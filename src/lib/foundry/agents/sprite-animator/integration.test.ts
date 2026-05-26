import { describe, expect, it } from "vitest";
import {
  renderFoundrySpriteIntegrationSnippet,
  renderFoundryLottieIntegrationSnippet,
} from "./integration";

describe("renderFoundrySpriteIntegrationSnippet", () => {
  it("emits an <AnimatedSprite> component reference", () => {
    const out = renderFoundrySpriteIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: ".foundry/packs/sprite-otis-idle",
      fps: 12,
      loops: true,
    });
    expect(out).toContain("<AnimatedSprite");
    expect(out).toContain('pack="otis-idle"');
  });

  it("emits the import from the foundry components root", () => {
    const out = renderFoundrySpriteIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: "x",
      fps: 12,
      loops: true,
    });
    expect(out).toContain('from "@/components/foundry/animated-sprite"');
  });

  it("documents fps and loops as comments", () => {
    const out = renderFoundrySpriteIntegrationSnippet({
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

describe("renderFoundryLottieIntegrationSnippet", () => {
  it("emits a <LottieAnimation> component import + JSX", () => {
    const out = renderFoundryLottieIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: ".foundry/packs/lottie-otis-idle",
      lottiePath: "lottie.json",
      durationMs: 1000,
    });
    expect(out).toContain("<LottieAnimation");
    expect(out).toContain('src="lottie.json"');
  });

  it("declares the GSAP timeline duration as a comment", () => {
    const out = renderFoundryLottieIntegrationSnippet({
      characterId: "otis",
      action: "idle",
      packPath: "x",
      lottiePath: "lottie.json",
      durationMs: 1234,
    });
    expect(out).toContain("1234");
  });
});
