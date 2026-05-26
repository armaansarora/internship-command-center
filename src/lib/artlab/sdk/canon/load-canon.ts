// src/lib/artlab/sdk/canon/load-canon.ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadArtLabCanonFile } from "./loader";
import { ArtLabCharacterCanonSchema, type ArtLabCharacterCanon } from "./character-schema";
import { ArtLabPaletteCanonSchema, type ArtLabPaletteCanon } from "./palette-schema";
import { ArtLabTypographyCanonSchema, type ArtLabTypographyCanon } from "./typography-schema";
import { ArtLabMotionLanguageCanonSchema, type ArtLabMotionLanguageCanon } from "./motion-language-schema";
import { ArtLabSpaceTokensCanonSchema, type ArtLabSpaceTokensCanon } from "./space-tokens-schema";
import { ArtLabIconographyRulesCanonSchema, type ArtLabIconographyRulesCanon } from "./iconography-rules-schema";

export interface ArtLabCanon {
  characters: readonly ArtLabCharacterCanon[];
  palettes: readonly ArtLabPaletteCanon[];
  typography: readonly ArtLabTypographyCanon[];
  motionLanguage: readonly ArtLabMotionLanguageCanon[];
  spaceTokens: readonly ArtLabSpaceTokensCanon[];
  iconographyRules: readonly ArtLabIconographyRulesCanon[];
  loadDurationMs: number;
  sourceFiles: readonly string[];
}

export interface LoadArtLabCanonInput {
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

export async function loadArtLabCanon(input: LoadArtLabCanonInput): Promise<ArtLabCanon> {
  const start = performance.now();
  const sources: string[] = [];

  const characterFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP.characters));
  const paletteFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP.palettes));
  const typographyFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP.typography));
  const motionFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP["motion-language"]));
  const spaceFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP["space-tokens"]));
  const iconoFiles = await listYamlFiles(join(input.canonRoot, KIND_DIR_MAP["iconography-rules"]));

  sources.push(...characterFiles, ...paletteFiles, ...typographyFiles, ...motionFiles, ...spaceFiles, ...iconoFiles);

  const characters: ArtLabCharacterCanon[] = [];
  for (const f of characterFiles) {
    const raw = await loadArtLabCanonFile(f);
    characters.push(ArtLabCharacterCanonSchema.parse(raw.data));
  }
  const palettes: ArtLabPaletteCanon[] = [];
  for (const f of paletteFiles) {
    const raw = await loadArtLabCanonFile(f);
    palettes.push(ArtLabPaletteCanonSchema.parse(raw.data));
  }
  const typography: ArtLabTypographyCanon[] = [];
  for (const f of typographyFiles) {
    const raw = await loadArtLabCanonFile(f);
    typography.push(ArtLabTypographyCanonSchema.parse(raw.data));
  }
  const motion: ArtLabMotionLanguageCanon[] = [];
  for (const f of motionFiles) {
    const raw = await loadArtLabCanonFile(f);
    motion.push(ArtLabMotionLanguageCanonSchema.parse(raw.data));
  }
  const space: ArtLabSpaceTokensCanon[] = [];
  for (const f of spaceFiles) {
    const raw = await loadArtLabCanonFile(f);
    space.push(ArtLabSpaceTokensCanonSchema.parse(raw.data));
  }
  const icono: ArtLabIconographyRulesCanon[] = [];
  for (const f of iconoFiles) {
    const raw = await loadArtLabCanonFile(f);
    icono.push(ArtLabIconographyRulesCanonSchema.parse(raw.data));
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
