// src/lib/foundry/canon/load-canon.ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadFoundryCanonFile } from "./loader";
import { FoundryCharacterCanonSchema, type FoundryCharacterCanon } from "./character-schema";
import { FoundryPaletteCanonSchema, type FoundryPaletteCanon } from "./palette-schema";
import { FoundryTypographyCanonSchema, type FoundryTypographyCanon } from "./typography-schema";
import { FoundryMotionLanguageCanonSchema, type FoundryMotionLanguageCanon } from "./motion-language-schema";
import { FoundrySpaceTokensCanonSchema, type FoundrySpaceTokensCanon } from "./space-tokens-schema";
import { FoundryIconographyRulesCanonSchema, type FoundryIconographyRulesCanon } from "./iconography-rules-schema";

export interface FoundryCanon {
  characters: readonly FoundryCharacterCanon[];
  palettes: readonly FoundryPaletteCanon[];
  typography: readonly FoundryTypographyCanon[];
  motionLanguage: readonly FoundryMotionLanguageCanon[];
  spaceTokens: readonly FoundrySpaceTokensCanon[];
  iconographyRules: readonly FoundryIconographyRulesCanon[];
  loadDurationMs: number;
  sourceFiles: readonly string[];
}

export interface LoadFoundryCanonInput {
  canonRoot: string;
}

const KIND_DIR_MAP = {
  characters: "characters",
  palettes: "palettes",
  typography: "typography",
  "motion-language": "motion-language",
  "space-tokens": "space-tokens",
  "iconography-rules": "iconography-rules",
} as const;

async function listYamlFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .map((name) => join(dir, name));
}

function checkDuplicates<T extends { header: { id: string } }>(
  records: readonly T[],
  kindLabel: string,
): void {
  const seen = new Set<string>();
  for (const r of records) {
    if (seen.has(r.header.id)) {
      throw new Error(`canon: duplicate ${kindLabel} id "${r.header.id}"`);
    }
    seen.add(r.header.id);
  }
}

export async function loadFoundryCanon(input: LoadFoundryCanonInput): Promise<FoundryCanon> {
  const start = performance.now();
  const sources: string[] = [];

  const characterFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP.characters));
  const paletteFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP.palettes));
  const typographyFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP.typography));
  const motionFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP["motion-language"]));
  const spaceFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP["space-tokens"]));
  const iconoFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP["iconography-rules"]));

  sources.push(...characterFiles, ...paletteFiles, ...typographyFiles, ...motionFiles, ...spaceFiles, ...iconoFiles);

  const characters: FoundryCharacterCanon[] = [];
  for (const f of characterFiles) {
    const raw = await loadFoundryCanonFile(f);
    characters.push(FoundryCharacterCanonSchema.parse(raw.data));
  }
  const palettes: FoundryPaletteCanon[] = [];
  for (const f of paletteFiles) {
    const raw = await loadFoundryCanonFile(f);
    palettes.push(FoundryPaletteCanonSchema.parse(raw.data));
  }
  const typography: FoundryTypographyCanon[] = [];
  for (const f of typographyFiles) {
    const raw = await loadFoundryCanonFile(f);
    typography.push(FoundryTypographyCanonSchema.parse(raw.data));
  }
  const motion: FoundryMotionLanguageCanon[] = [];
  for (const f of motionFiles) {
    const raw = await loadFoundryCanonFile(f);
    motion.push(FoundryMotionLanguageCanonSchema.parse(raw.data));
  }
  const space: FoundrySpaceTokensCanon[] = [];
  for (const f of spaceFiles) {
    const raw = await loadFoundryCanonFile(f);
    space.push(FoundrySpaceTokensCanonSchema.parse(raw.data));
  }
  const icono: FoundryIconographyRulesCanon[] = [];
  for (const f of iconoFiles) {
    const raw = await loadFoundryCanonFile(f);
    icono.push(FoundryIconographyRulesCanonSchema.parse(raw.data));
  }

  checkDuplicates(characters, "character");
  checkDuplicates(palettes, "palette");
  checkDuplicates(typography, "typography");
  checkDuplicates(motion, "motion-language");
  checkDuplicates(space, "space-tokens");
  checkDuplicates(icono, "iconography-rules");

  return {
    characters,
    palettes,
    typography,
    motionLanguage: motion,
    spaceTokens: space,
    iconographyRules: icono,
    loadDurationMs: Math.round(performance.now() - start),
    sourceFiles: sources,
  };
}
