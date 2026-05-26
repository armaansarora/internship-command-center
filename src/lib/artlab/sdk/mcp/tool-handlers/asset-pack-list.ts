import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  FoundryAssetPackListInputSchema,
  FoundryAssetPackListOutputSchema,
  FOUNDRY_ASSET_KINDS,
  type FoundryAssetPackListOutput,
} from "../tools";

export interface FoundryAssetPackListContext {
  /** Root directory containing one subdirectory per promoted Asset Pack. */
  packsRoot: string;
}

const ManifestSchema = z
  .object({
    packId: z.string().min(1),
    kind: z.enum(FOUNDRY_ASSET_KINDS),
    slotId: z.string().min(1),
    promotedAt: z.string().datetime({ offset: true }),
    characterId: z.string().min(1).optional(),
    space: z.string().min(1).optional(),
  })
  .strict();

export async function handleFoundryAssetPackList(
  rawInput: unknown,
  ctx: FoundryAssetPackListContext,
): Promise<FoundryAssetPackListOutput> {
  const input = FoundryAssetPackListInputSchema.parse(rawInput);
  if (!existsSync(ctx.packsRoot)) {
    return FoundryAssetPackListOutputSchema.parse({ packs: [] });
  }

  const packs: FoundryAssetPackListOutput["packs"] = [];
  for (const dir of readdirSync(ctx.packsRoot)) {
    const manifestPath = join(ctx.packsRoot, dir, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    if (!statSync(join(ctx.packsRoot, dir)).isDirectory()) continue;
    try {
      const parsed = ManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
      if (input.kind && parsed.kind !== input.kind) continue;
      if (input.characterId && parsed.characterId !== input.characterId) continue;
      if (input.space && parsed.space !== input.space) continue;
      packs.push({
        packId: parsed.packId,
        kind: parsed.kind,
        slotId: parsed.slotId,
        promotedAt: parsed.promotedAt,
        characterId: parsed.characterId,
        space: parsed.space,
      });
    } catch (err) {
      throw new Error(`malformed manifest at ${manifestPath}: ${String(err)}`);
    }
  }

  // Stable order: by promotedAt ascending so latest is at the bottom.
  packs.sort((a, b) => a.promotedAt.localeCompare(b.promotedAt));
  return FoundryAssetPackListOutputSchema.parse({ packs });
}
