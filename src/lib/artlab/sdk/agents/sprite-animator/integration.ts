import type { ArtLabSpriteAction } from "./types";

export interface ArtLabSpriteIntegrationInput {
  characterId: string;
  action: ArtLabSpriteAction;
  packPath: string;
  fps: number;
  loops: boolean;
}

export function renderArtLabSpriteIntegrationSnippet(
  input: ArtLabSpriteIntegrationInput,
): string {
  const packTag = `${input.characterId}-${input.action}`;
  return [
    `// ArtLab sprite pack: ${input.packPath}`,
    `// fps=${input.fps} loops=${input.loops}`,
    `import { AnimatedSprite } from "@/components/artlab/animated-sprite";`,
    ``,
    `<AnimatedSprite pack="${packTag}" />`,
  ].join("\n");
}

export interface ArtLabLottieIntegrationInput {
  characterId: string;
  action: ArtLabSpriteAction;
  packPath: string;
  lottiePath: string;
  durationMs: number;
}

export function renderArtLabLottieIntegrationSnippet(
  input: ArtLabLottieIntegrationInput,
): string {
  return [
    `// ArtLab Lottie pack: ${input.packPath}`,
    `// GSAP timeline duration: ${input.durationMs}ms`,
    `import { LottieAnimation } from "@/components/artlab/lottie-animation";`,
    ``,
    `<LottieAnimation src="${input.lottiePath}" />`,
  ].join("\n");
}
