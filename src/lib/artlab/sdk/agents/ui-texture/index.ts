// src/lib/artlab/sdk/agents/ui-texture/index.ts
import sharp from "sharp";
import { buildArtLabAssetPack } from "@/lib/artlab/sdk/asset-pack";
import { loadArtLabIconRulesAdapter } from "./icon-rules";
import { loadArtLabTextureRulesAdapter } from "./texture-rules";
import { extractArtLabNormalMap } from "./stages/normal-map";
import { evaluateArtLabSvgStrokeWidth } from "./qa/svg-stroke-width";
import { evaluateArtLabSvgAriaLabel } from "./qa/svg-aria-label";
import { evaluateArtLabTileContinuity } from "./qa/tile-continuity";
import {
  writeArtLabUiIconPack,
  writeArtLabUiTexturePack,
} from "./pack-writer";
import {
  renderArtLabIconIntegrationSnippet,
  renderArtLabTextureIntegrationSnippet,
} from "./integration";
import {
  ArtLabUiTextureInputSchema,
  type ArtLabUiTextureInput,
} from "./types";
import type { ArtLabIconLlmProvider } from "./llm-provider";
import type { ArtLabImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";

export interface ArtLabUiTextureProviders {
  iconLlm: ArtLabIconLlmProvider;
  image: ArtLabImageProvider;
}

export interface ArtLabUiTextureContext {
  runDir: string;
}

export interface ArtLabUiTextureResult {
  packId: string;
  manifest: Record<string, unknown>;
}

export async function runArtLabUiTexture(
  rawInput: ArtLabUiTextureInput,
  providers: ArtLabUiTextureProviders,
  context: ArtLabUiTextureContext,
): Promise<ArtLabUiTextureResult> {
  const input = ArtLabUiTextureInputSchema.parse(rawInput);
  if (input.kind === "icon") {
    const rules = await loadArtLabIconRulesAdapter();
    const llmResult = await providers.iconLlm.emitSvg({
      name: input.name,
      ariaLabel: input.ariaLabel,
      strokeWidthPx: rules.strokeWidthPx,
      viewBox: rules.viewBox,
      seed: input.seed,
    });
    const strokeReport = evaluateArtLabSvgStrokeWidth(llmResult.svg, {
      strokeWidthPx: rules.strokeWidthPx,
      strokeWidthTolerancePx: rules.strokeWidthTolerancePx,
    });
    const ariaReport = evaluateArtLabSvgAriaLabel(
      llmResult.svg,
      input.ariaLabel,
    );
    const failed: string[] = [];
    if (!strokeReport.passed) failed.push("stroke-width");
    if (!ariaReport.passed) failed.push("aria-label");
    if (failed.length > 0) {
      throw new Error(
        `artlab/ui-icon: qa failed for ${input.name} — gates=${failed.join(",")}`,
      );
    }
    const pack = await writeArtLabUiIconPack({
      runDir: context.runDir,
      name: input.name,
      svg: llmResult.svg,
    });
    const integrationSnippet = renderArtLabIconIntegrationSnippet({
      name: input.name,
      packPath: pack.packRoot,
    });
    const manifest = {
      assetKind: "ui-icon" as const,
      name: input.name,
      icon: {
        svgPath: pack.svgPath,
        ariaLabel: input.ariaLabel,
        strokeWidthPx: rules.strokeWidthPx,
        viewBox: rules.viewBox,
      },
      integrationSnippet,
      qa: { strokeWidth: strokeReport, ariaLabel: ariaReport },
    };
    return buildArtLabAssetPack(manifest);
  }
  // texture kind
  const rules = await loadArtLabTextureRulesAdapter();
  const image = await providers.image.generateImage({
    prompt: `Tileable luxury Tower UI texture: ${input.name}, ${input.tileMode}`,
    aspectRatio: "1:1",
    seed: input.seed,
  });
  const resized = await sharp(image.bytes)
    .resize(rules.targetResolutionPx, rules.targetResolutionPx, { fit: "fill" })
    .png()
    .toBuffer();
  const tileReport = await evaluateArtLabTileContinuity(resized, {
    tileToleranceDeltaE: rules.tileToleranceDeltaE,
  });
  if (!tileReport.passed) {
    throw new Error(
      `artlab/ui-texture: tile-continuity failed for ${input.name} — maxDeltaE=${tileReport.maxDeltaE}`,
    );
  }
  const normalMap = await extractArtLabNormalMap(resized, {
    strength: rules.normalMapStrength,
  });
  const pack = await writeArtLabUiTexturePack({
    runDir: context.runDir,
    name: input.name,
    pngBytes: resized,
    normalMapBytes: normalMap,
  });
  const integrationSnippet = renderArtLabTextureIntegrationSnippet({
    name: input.name,
    pngPath: pack.pngPath,
    normalMapPath: pack.normalMapPath,
    tileMode: input.tileMode,
  });
  const manifest = {
    assetKind: "ui-texture" as const,
    name: input.name,
    texture: {
      pngPath: pack.pngPath,
      normalMapPath: pack.normalMapPath,
      tileMode: input.tileMode,
      targetResolutionPx: rules.targetResolutionPx,
    },
    integrationSnippet,
    qa: { tileContinuity: tileReport },
  };
  return buildArtLabAssetPack(manifest);
}
