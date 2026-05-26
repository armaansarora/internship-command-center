import type { FoundrySpriteAction } from "./types";

export interface FoundrySpriteIntegrationInput {
  characterId: string;
  action: FoundrySpriteAction;
  packPath: string;
  fps: number;
  loops: boolean;
}

export function renderFoundrySpriteIntegrationSnippet(
  input: FoundrySpriteIntegrationInput,
): string {
  const packTag = `${input.characterId}-${input.action}`;
  return [
    `// Foundry sprite pack: ${input.packPath}`,
    `// fps=${input.fps} loops=${input.loops}`,
    `import { AnimatedSprite } from "@/components/artlab/animated-sprite";`,
    ``,
    `<AnimatedSprite pack="${packTag}" />`,
  ].join("\n");
}

export interface FoundryLottieIntegrationInput {
  characterId: string;
  action: FoundrySpriteAction;
  packPath: string;
  lottiePath: string;
  durationMs: number;
}

export function renderFoundryLottieIntegrationSnippet(
  input: FoundryLottieIntegrationInput,
): string {
  return [
    `// Foundry Lottie pack: ${input.packPath}`,
    `// GSAP timeline duration: ${input.durationMs}ms`,
    `import { LottieAnimation } from "@/components/artlab/lottie-animation";`,
    ``,
    `<LottieAnimation src="${input.lottiePath}" />`,
  ].join("\n");
}
