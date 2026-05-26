import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ArtLabAssetPackIntegrationInputSchema,
  ArtLabAssetPackIntegrationOutputSchema,
  type ArtLabAssetPackIntegrationInput,
  type ArtLabAssetPackIntegrationOutput,
  type ArtLabAssetKind,
} from "../tools";
import {
  PackIdSchema,
  resolvePackDir,
  assertUrlPathSafeAgainstTraversal,
} from "../lib/path-safety";
import type { ArtLabAssetPackListContext } from "./asset-pack-list";

interface ManifestForIntegration {
  packId: string;
  kind: ArtLabAssetKind;
  publicPath: string;
  integration?: Record<string, unknown>;
}

// Round-4 Codex review surfaced that integration.{alt,cssVar,...} flowed into
// generated TSX/CSS via bare template strings. The sister file
// integration-snippet.ts was hardened with JSON.stringify quoting; this file
// was overlooked because no production producer writes `integration: {...}`
// to manifest.json today (only test fixtures populate it). Apply the same
// quote() helper before any caller starts writing that field through the
// MCP SDK surface and the round-3 fix gets bypassed.
function quote(s: string): string {
  return JSON.stringify(s);
}

// CSS custom property identifier — must match the CSS grammar. Rejects
// anything that could break out of the declaration (newlines, semicolons,
// braces, comments, etc.).
const CSS_VAR_RE = /^--[a-zA-Z_][a-zA-Z0-9_-]*$/;
function assertCssVarName(s: string, source: string): string {
  if (!CSS_VAR_RE.test(s)) {
    throw new Error(
      `${source}: invalid CSS custom property name '${s}' — must match /^--[a-zA-Z_][a-zA-Z0-9_-]*$/`,
    );
  }
  return s;
}

// JS-identifier validator — matches the JsIdentifier refinement on the
// manifest schema. Used for the icon snippet's `import <Ident> from ...`
// where the symbol name is derived from packId (already validated by
// PackIdSchema, but we re-assert post-camelize for defence in depth).
const JS_IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
function assertJsIdentifier(s: string, source: string): string {
  if (!JS_IDENT_RE.test(s)) {
    throw new Error(`${source}: '${s}' is not a valid JS identifier`);
  }
  return s;
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
    snippet: `<Image src=${quote(m.publicPath)} width={${width}} height={${height}} alt=${quote(alt)} priority />`,
  };
}

function snippetForFloor(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const alt = String(m.integration?.alt ?? `${m.packId} floor background`);
  return {
    importStatement: 'import Image from "next/image";',
    snippet: `<Image src=${quote(m.publicPath)} fill alt=${quote(alt)} priority sizes="100vw" />`,
  };
}

function snippetForUiTexture(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const cssVar = assertCssVarName(
    String(m.integration?.cssVar ?? `--${m.packId}-bg`),
    "integration.cssVar",
  );
  return {
    importStatement: "// CSS var — no JS import",
    snippet: `:root { ${cssVar}: url(${quote(m.publicPath)}); }`,
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
  const symbol = assertJsIdentifier(camelize(m.packId), "icon import symbol");
  return {
    importStatement: `import ${symbol} from ${quote(m.publicPath)};`,
    snippet: `<img src={${symbol}} alt=${quote(m.packId)} aria-hidden="true" />`,
  };
}

function snippetForSpriteAnimation(m: ManifestForIntegration): {
  importStatement: string;
  snippet: string;
} {
  const fps = Number(m.integration?.fps ?? 24);
  return {
    importStatement:
      'import { SpriteSheetPlayer } from "@/components/artlab/sprite-sheet-player";',
    snippet: `<SpriteSheetPlayer sheet=${quote(m.publicPath)} fps={${fps}} loop />`,
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
    snippet: `<DotLottieReact src=${quote(m.publicPath)} style={{ width: ${width}, height: ${height} }} loop={${loop}} autoplay={${autoplay}} />`,
  };
}

function snippetFor(
  m: ManifestForIntegration,
  framework: ArtLabAssetPackIntegrationInput["targetFramework"],
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

export async function handleArtLabAssetPackIntegration(
  rawInput: unknown,
  ctx: ArtLabAssetPackListContext,
): Promise<ArtLabAssetPackIntegrationOutput> {
  const input = ArtLabAssetPackIntegrationInputSchema.parse(rawInput);
  // Defense in depth: validate packId charset/encoding before any path join,
  // then re-confirm the resolved directory stays inside packsRoot.
  const safePackId = PackIdSchema.parse(input.packId);
  const packDir = resolvePackDir(ctx.packsRoot, safePackId);
  const manifestPath = join(packDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`asset pack not found: ${safePackId}`);
  }
  const m = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestForIntegration;
  if (!m.integration) {
    throw new Error(`asset pack integration metadata missing on manifest: ${safePackId}`);
  }
  // Defense in depth: a poisoned manifest could publish a `publicPath` that
  // contains traversal or encoded payloads, and the snippets below
  // interpolate that value straight into `src=` / `url(...)`. We don't try
  // to confine it to the asset-pack URL space (publicPath is an absolute
  // app-route by convention so a leading `/` is allowed), but we DO reject
  // `..` traversal, encoded equivalents, backslash, NUL, tilde, and
  // dangerous URL schemes — vectors the prior schema let through.
  if (typeof m.publicPath !== "string") {
    throw new Error(`asset pack publicPath missing on manifest: ${safePackId}`);
  }
  assertUrlPathSafeAgainstTraversal(m.publicPath, "manifest publicPath");
  const built = snippetFor(m, input.targetFramework);
  return ArtLabAssetPackIntegrationOutputSchema.parse({
    packId: safePackId,
    importStatement: built.importStatement,
    snippet: built.snippet,
    notes: [`framework: ${input.targetFramework}`, `kind: ${m.kind}`],
  });
}
