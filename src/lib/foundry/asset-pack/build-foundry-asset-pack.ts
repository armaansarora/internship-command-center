import { randomUUID } from "node:crypto";

export interface BuiltFoundryAssetPack {
  packId: string;
  manifest: Record<string, unknown>;
}

export async function buildFoundryAssetPack(
  manifest: Record<string, unknown>,
): Promise<BuiltFoundryAssetPack> {
  return { packId: randomUUID(), manifest };
}
