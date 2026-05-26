import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryAssetPackIntegrationInputSchema,
  FoundryAssetPackIntegrationOutputSchema,
  type FoundryAssetPackIntegrationInput,
  type FoundryAssetPackIntegrationOutput,
  type FoundryAssetKind,
} from "../tools";
import type { FoundryAssetPackListContext } from "./asset-pack-list";

interface ManifestForIntegration {
  packId: string;
  kind: FoundryAssetKind;
  publicPath: string;
  integration?: Record<string, unknown>;
}

function snippetForCharacter(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const width = Number(m.integration?.width ?? 512);
  const height = Number(m.integration?.height ?? 768);
  const alt = String(m.integration?.alt ?? m.packId);
  return {
    importStatement: 'import Image from "next/image";',
    snippet: `<Image src="${m.publicPath}" width={${width}} height={${height}} alt="${alt}" priority />`,
  };
}

function snippetForFloor(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const alt = String(m.integration?.alt ?? `${m.packId} floor background`);
  return {
    importStatement: 'import Image from "next/image";',
    snippet: `<Image src="${m.publicPath}" fill alt="${alt}" priority sizes="100vw" />`,
  };
}

function snippetForUiTexture(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const cssVar = String(m.integration?.cssVar ?? `--${m.packId}-bg`);
  return {
    importStatement: "// CSS var — no JS import",
    snippet: `:root { ${cssVar}: url("${m.publicPath}"); }`,
  };
}

function camelize(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}

function snippetForIcon(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  return {
    importStatement: `import ${camelize(m.packId)} from "${m.publicPath}";`,
    snippet: `<img src={${camelize(m.packId)}} alt="${m.packId}" aria-hidden="true" />`,
  };
}

function snippetForSpriteAnimation(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const fps = Number(m.integration?.fps ?? 24);
  return {
    importStatement:
      'import { SpriteSheetPlayer } from "@/components/foundry/sprite-sheet-player";',
    snippet: `<SpriteSheetPlayer sheet="${m.publicPath}" fps={${fps}} loop />`,
  };
}

function snippetForLottie(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const width = Number(m.integration?.width ?? 240);
  const height = Number(m.integration?.height ?? 240);
  const loop = m.integration?.loop !== false;
  const autoplay = m.integration?.autoplay !== false;
  return {
    importStatement: 'import { DotLottieReact } from "@lottiefiles/dotlottie-react";',
    snippet: `<DotLottieReact src="${m.publicPath}" style={{ width: ${width}, height: ${height} }} loop={${loop}} autoplay={${autoplay}} />`,
  };
}

function snippetFor(
  m: ManifestForIntegration,
  framework: FoundryAssetPackIntegrationInput["targetFramework"],
): { importStatement: string; snippet: string } {
  if (framework === "raw") {
    return snippetForUiTexture(m);
  }
  switch (m.kind) {
    case "character":
      return snippetForCharacter(m);
    case "floor":
      return snippetForFloor(m);
    case "ui-texture":
      return snippetForUiTexture(m);
    case "icon":
      return snippetForIcon(m);
    case "sprite-animation":
      return snippetForSpriteAnimation(m);
    case "lottie":
      return snippetForLottie(m);
  }
}

export async function handleFoundryAssetPackIntegration(
  rawInput: unknown,
  ctx: FoundryAssetPackListContext,
): Promise<FoundryAssetPackIntegrationOutput> {
  const input = FoundryAssetPackIntegrationInputSchema.parse(rawInput);
  const manifestPath = join(ctx.packsRoot, input.packId, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`asset pack not found: ${input.packId}`);
  }
  const m = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestForIntegration;
  if (!m.integration) {
    throw new Error(`asset pack integration metadata missing on manifest: ${input.packId}`);
  }
  const built = snippetFor(m, input.targetFramework);
  return FoundryAssetPackIntegrationOutputSchema.parse({
    packId: input.packId,
    importStatement: built.importStatement,
    snippet: built.snippet,
    notes: [`framework: ${input.targetFramework}`, `kind: ${m.kind}`],
  });
}
