// src/lib/foundry/agents/ui-texture/index.ts
import sharp from "sharp";
import { buildFoundryAssetPack } from "@/lib/artlab/sdk/asset-pack";
import { loadFoundryIconRulesAdapter } from "./icon-rules";
import { loadFoundryTextureRulesAdapter } from "./texture-rules";
import { extractFoundryNormalMap } from "./stages/normal-map";
import { evaluateFoundrySvgStrokeWidth } from "./qa/svg-stroke-width";
import { evaluateFoundrySvgAriaLabel } from "./qa/svg-aria-label";
import { evaluateFoundryTileContinuity } from "./qa/tile-continuity";
import {
  writeFoundryUiIconPack,
  writeFoundryUiTexturePack,
} from "./pack-writer";
import {
  renderFoundryIconIntegrationSnippet,
  renderFoundryTextureIntegrationSnippet,
} from "./integration";
import {
  FoundryUiTextureInputSchema,
  type FoundryUiTextureInput,
} from "./types";
import type { FoundryIconLlmProvider } from "./llm-provider";
import type { FoundryImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";

export interface FoundryUiTextureProviders {
  iconLlm: FoundryIconLlmProvider;
  image: FoundryImageProvider;
}

export interface FoundryUiTextureContext {
  runDir: string;
}

export interface FoundryUiTextureResult {
  packId: string;
  manifest: Record<string, unknown>;
}

export async function runFoundryUiTexture(
  rawInput: FoundryUiTextureInput,
  providers: FoundryUiTextureProviders,
  context: FoundryUiTextureContext,
): Promise<FoundryUiTextureResult> {
  const input = FoundryUiTextureInputSchema.parse(rawInput);
  if (input.kind === "icon") {
    const rules = await loadFoundryIconRulesAdapter();
    const llmResult = await providers.iconLlm.emitSvg({
      name: input.name,
      ariaLabel: input.ariaLabel,
      strokeWidthPx: rules.strokeWidthPx,
      viewBox: rules.viewBox,
      seed: input.seed,
    });
    const strokeReport = evaluateFoundrySvgStrokeWidth(llmResult.svg, {
      strokeWidthPx: rules.strokeWidthPx,
      strokeWidthTolerancePx: rules.strokeWidthTolerancePx,
    });
    const ariaReport = evaluateFoundrySvgAriaLabel(
      llmResult.svg,
      input.ariaLabel,
    );
    const failed: string[] = [];
    if (!strokeReport.passed) failed.push("stroke-width");
    if (!ariaReport.passed) failed.push("aria-label");
    if (failed.length > 0) {
      throw new Error(
        `foundry/ui-icon: qa failed for ${input.name} — gates=${failed.join(",")}`,
      );
    }
    const pack = await writeFoundryUiIconPack({
      runDir: context.runDir,
      name: input.name,
      svg: llmResult.svg,
    });
    const integrationSnippet = renderFoundryIconIntegrationSnippet({
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
    return buildFoundryAssetPack(manifest);
  }
  // texture kind
  const rules = await loadFoundryTextureRulesAdapter();
  const image = await providers.image.generateImage({
    prompt: `Tileable luxury Tower UI texture: ${input.name}, ${input.tileMode}`,
    aspectRatio: "1:1",
    seed: input.seed,
  });
  const resized = await sharp(image.bytes)
    .resize(rules.targetResolutionPx, rules.targetResolutionPx, { fit: "fill" })
    .png()
    .toBuffer();
  const tileReport = await evaluateFoundryTileContinuity(resized, {
    tileToleranceDeltaE: rules.tileToleranceDeltaE,
  });
  if (!tileReport.passed) {
    throw new Error(
      `foundry/ui-texture: tile-continuity failed for ${input.name} — maxDeltaE=${tileReport.maxDeltaE}`,
    );
  }
  const normalMap = await extractFoundryNormalMap(resized, {
    strength: rules.normalMapStrength,
  });
  const pack = await writeFoundryUiTexturePack({
    runDir: context.runDir,
    name: input.name,
    pngBytes: resized,
    normalMapBytes: normalMap,
  });
  const integrationSnippet = renderFoundryTextureIntegrationSnippet({
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
  return buildFoundryAssetPack(manifest);
}
