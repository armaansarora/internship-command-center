import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  ArtLabSlotAuditInputSchema,
  ArtLabSlotAuditOutputSchema,
  ARTLAB_ASSET_KINDS,
  type ArtLabSlotAuditOutput,
} from "../tools";

const SlotEntrySchema = z
  .object({
    slotId: z.string().min(1),
    kind: z.enum(ARTLAB_ASSET_KINDS),
    space: z.string().min(1).optional(),
    characterId: z.string().min(1).optional(),
    description: z.string().min(1),
  })
  .strict();

const SlotRegistrySchema = z.object({ slots: z.array(SlotEntrySchema) }).strict();

export interface ArtLabSlotAuditContext {
  slotRegistryPath: string;
  packsRoot: string;
}

function loadCoveredSlotIds(packsRoot: string): Set<string> {
  const covered = new Set<string>();
  if (!existsSync(packsRoot)) return covered;
  for (const dir of readdirSync(packsRoot)) {
    const manifest = join(packsRoot, dir, "manifest.json");
    if (!existsSync(manifest)) continue;
    try {
      const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { slotId?: string };
      if (typeof parsed.slotId === "string") covered.add(parsed.slotId);
    } catch (err) {
      throw new Error(`malformed manifest at ${manifest}: ${String(err)}`);
    }
  }
  return covered;
}

export async function handleArtLabSlotAudit(
  rawInput: unknown,
  ctx: ArtLabSlotAuditContext,
): Promise<ArtLabSlotAuditOutput> {
  const input = ArtLabSlotAuditInputSchema.parse(rawInput);
  if (!existsSync(ctx.slotRegistryPath)) {
    throw new Error(`slot registry missing at ${ctx.slotRegistryPath}`);
  }
  const registry = SlotRegistrySchema.parse(
    JSON.parse(readFileSync(ctx.slotRegistryPath, "utf8")),
  );
  const covered = loadCoveredSlotIds(ctx.packsRoot);

  let scoped = registry.slots;
  if (input.kind) scoped = scoped.filter((s) => s.kind === input.kind);
  if (input.space) scoped = scoped.filter((s) => s.space === input.space);

  const missing = scoped.filter((s) => !covered.has(s.slotId));
  const coveredInScope = scoped.length - missing.length;

  return ArtLabSlotAuditOutputSchema.parse({
    missing: missing.map((s) => ({
      slotId: s.slotId,
      kind: s.kind,
      space: s.space,
      characterId: s.characterId,
      description: s.description,
    })),
    coveredCount: coveredInScope,
    totalCount: scoped.length,
  });
}
