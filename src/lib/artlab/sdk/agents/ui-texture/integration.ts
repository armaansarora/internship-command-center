// src/lib/artlab/sdk/agents/ui-texture/integration.ts
function toPascal(name: string): string {
  return name
    .split("-")
    .filter((s) => s.length > 0)
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join("");
}

export interface ArtLabIconIntegrationInput {
  name: string;
  packPath: string;
}

export function renderArtLabIconIntegrationSnippet(
  input: ArtLabIconIntegrationInput,
): string {
  const component = `${toPascal(input.name)}Icon`;
  return [
    `// ArtLab asset pack: ${input.packPath}`,
    `// Building-metaphor icon — drop directly into JSX.`,
    `import { ${component} } from "@/components/artlab/icons/${input.name}";`,
    ``,
    `<${component} />`,
  ].join("\n");
}

export interface ArtLabTextureIntegrationInput {
  name: string;
  pngPath: string;
  normalMapPath: string;
  tileMode: "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
}

export function renderArtLabTextureIntegrationSnippet(
  input: ArtLabTextureIntegrationInput,
): string {
  return [
    `// ArtLab texture: ${input.name} (tile-mode: ${input.tileMode})`,
    `// Tailwind utility class — drop on the target element.`,
    `// CSS variable carries the normal map for any custom shader stage.`,
    `<div`,
    `  className="bg-[url('${input.pngPath}')] bg-${input.tileMode}"`,
    `  style={{ ['--artlab-normal-map' as string]: \`url('${input.normalMapPath}')\` }}`,
    `/>`,
  ].join("\n");
}
