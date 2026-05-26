import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sha256OfBytes } from "./hashing";
import { resolveArtLabSlot } from "./slot-registry";
import {
  ArtLabAssetPackManifestSchema,
  type ArtLabAssetPackManifest,
} from "./manifest.schema";
import { ARTLAB_ASSET_PACK_VERSION } from "./constants";

export interface LiftLegacyAssetInput {
  characterId: string;
  outfit: "regular" | "summer-light" | "winter-layered";
  pose: "idle" | "greeting" | "listening" | "thinking" | "talking" | "alert" | "working";
  payloadAbsPath: string;
  provider: string;
  modelId: string;
  generatedAt: string;
  seed?: number;
  costCents?: number;
  durationMs?: number;
}

export interface LiftedSdkAssetPack {
  manifest: ArtLabAssetPackManifest;
  payloadBytes: Buffer;
  primaryFileRelPath: string;
}

function dirPartForCharacter(characterId: string): string {
  if (characterId === "otis") return "lobby/otis";
  if (characterId === "mara-voss" || characterId === "ceo") return "penthouse/ceo";
  throw new Error(`legacy-shim: no dir mapping for character "${characterId}"`);
}

export async function liftLegacyArtLabAssetToSdkPack(input: LiftLegacyAssetInput): Promise<LiftedSdkAssetPack> {
  const dirPart = dirPartForCharacter(input.characterId);
  const slotId = `${dirPart}/${input.outfit}/${input.pose}`;
  const slot = resolveArtLabSlot(slotId);
  if (!slot) {
    throw new Error(`legacy-shim: no registered slot for ${slotId}`);
  }
  const bytes = await readFile(input.payloadAbsPath);
  const fileStat = await stat(input.payloadAbsPath);
  const primaryFileRelPath = `${input.pose}.webp`;

  const manifest = ArtLabAssetPackManifestSchema.parse({
    manifestVersion: ARTLAB_ASSET_PACK_VERSION,
    packId: randomUUID(),
    kind: "character-sprite",
    agent: "character-master",
    canonRefs: {
      characterId: input.characterId,
      paletteRef: "tower-default",
      typographyRef: null,
      motionLanguageRef: null,
    },
    dimensions: {
      sourceWidthPx: 2400,
      sourceHeightPx: 4096,
      displayWidthPx: 160,
      displayHeightPx: 280,
      aspectRatio: "9:16",
    },
    colorTokensUsed: ["primaryDark", "goldAccent"],
    intendedSlot: {
      slotId,
      appPath: slot.appPath,
      component: slot.component,
      requiresGsap: slot.requiresGsap,
    },
    gsapCues: [],
    accessibility: {
      altText: `${input.characterId} character sprite, ${input.outfit} outfit, ${input.pose} pose`,
      role: "img",
      prefersReducedMotionStrategy: "static-fallback",
    },
    integrationSnippetTemplate: "character-sprite-img",
    payload: {
      files: [{ relPath: primaryFileRelPath, sha256: sha256OfBytes(bytes), bytes: fileStat.size }],
      primaryFileRelPath,
    },
    generation: {
      agentName: "character-master",
      provider: input.provider,
      modelId: input.modelId,
      seed: input.seed ?? 0,
      costCents: input.costCents ?? 0,
      durationMs: input.durationMs ?? 0,
      generatedAt: input.generatedAt,
    },
  });

  return { manifest, payloadBytes: bytes, primaryFileRelPath };
}
