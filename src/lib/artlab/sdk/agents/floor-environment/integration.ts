export interface ArtLabFloorIntegrationInput {
  floorSlug: string;
  packPath: string;
}

export function renderArtLabFloorIntegrationSnippet(
  input: ArtLabFloorIntegrationInput,
): string {
  return [
    `// ArtLab asset pack: ${input.packPath}`,
    `// Floor: ${input.floorSlug}`,
    `// The existing DayNightProvider chooses the time-state variant at runtime.`,
    `import { FloorBackground } from "@/components/artlab/floor-background";`,
    ``,
    `<FloorBackground floor="${input.floorSlug}" />`,
  ].join("\n");
}
