import { ARTLAB_ASSET_KINDS, type ArtLabAssetKind } from "./constants";
import { APP_PATH_PREFIXES, isPathSafeAgainstTraversal } from "./manifest.schema";

export interface ArtLabSlotRecord {
  slotId: string;
  appPath: string;
  kind: ArtLabAssetKind;
  component: string | null;
  requiresGsap: boolean;
}

const OUTFIT_VARIANTS = ["regular", "summer-light", "winter-layered"] as const;
const POSE_STATES = ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"] as const;

const ANIMATION_ACTIONS = ["idle", "wave", "nod", "celebrate"] as const;
const ANIMATION_FORMATS = ["sprite", "lottie"] as const;

function buildCharacterSlots(characterId: string, dirPart: string, component: string): ArtLabSlotRecord[] {
  const slots: ArtLabSlotRecord[] = [];
  for (const outfit of OUTFIT_VARIANTS) {
    for (const pose of POSE_STATES) {
      slots.push({
        slotId: `${dirPart}/${outfit}/${pose}`,
        appPath: `public/art/${dirPart}/${outfit}/${pose}.webp`,
        kind: "character-sprite",
        component,
        requiresGsap: false,
      });
    }
  }
  return slots;
}

/**
 * Sprite-animator slots: one per (character, action, format). The primary
 * file inside the pack is referenced by the manifest's `intendedSlot.appPath`
 * — sprite frames live under `public/animations/<characterId>/<action>/sprite/`
 * (frame-000.png is the primary), and Lottie packs publish a single
 * `public/animations/<characterId>/<action>/lottie.json`. These slots are
 * registered statically so any character-master-promoted pack id can flow
 * into the sprite-animator and back out into a canonical
 * `ArtLabAssetPackManifestSchema`-strict manifest without runtime slot
 * registration churn.
 */
function buildAnimationSlots(characterId: string): ArtLabSlotRecord[] {
  const slots: ArtLabSlotRecord[] = [];
  for (const action of ANIMATION_ACTIONS) {
    for (const format of ANIMATION_FORMATS) {
      const dirPart = `animations/${characterId}/${action}`;
      slots.push({
        slotId: `${dirPart}/${format}`,
        appPath:
          format === "sprite"
            ? `public/${dirPart}/sprite/frame-000.png`
            : `public/${dirPart}/lottie.json`,
        kind: "sprite-animation",
        component: null,
        requiresGsap: format === "sprite",
      });
    }
  }
  return slots;
}

const BUILTIN_SLOTS: readonly ArtLabSlotRecord[] = [
  ...buildCharacterSlots("otis", "lobby/otis", "OtisCharacter"),
  ...buildCharacterSlots("mara-voss", "penthouse/ceo", "CeoCharacter"),
  ...buildAnimationSlots("otis"),
  ...buildAnimationSlots("mara-voss"),
];

const dynamicSlots: ArtLabSlotRecord[] = [];

export const ARTLAB_SLOT_REGISTRY: readonly ArtLabSlotRecord[] = new Proxy([], {
  get(_target, prop) {
    const merged: readonly ArtLabSlotRecord[] = [...BUILTIN_SLOTS, ...dynamicSlots];
    const value = (merged as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function" ? value.bind(merged) : value;
  },
}) as unknown as readonly ArtLabSlotRecord[];

export function isArtLabSlotRegistered(slotId: string): boolean {
  return BUILTIN_SLOTS.some((s) => s.slotId === slotId) || dynamicSlots.some((s) => s.slotId === slotId);
}

export function resolveArtLabSlot(slotId: string): ArtLabSlotRecord | undefined {
  return BUILTIN_SLOTS.find((s) => s.slotId === slotId) ?? dynamicSlots.find((s) => s.slotId === slotId);
}

export function registerArtLabSlot(record: ArtLabSlotRecord): void {
  if (isArtLabSlotRegistered(record.slotId)) {
    throw new Error(`registerArtLabSlot: slotId already registered: ${record.slotId}`);
  }
  if (!/^[a-z0-9/_-]+$/.test(record.slotId)) {
    throw new Error(`registerArtLabSlot: invalid slotId format: ${record.slotId}`);
  }
  // Defence-in-depth — the slot registry is the trust anchor for
  // `validateArtLabManifestAgainstSlots`. If we let a caller register a slot
  // whose appPath escapes the allow-list, a matching malicious manifest
  // would then sail through `slot-appath-disagrees` because the registry and
  // manifest agree on the rogue path.
  if (!isPathSafeAgainstTraversal(record.appPath, APP_PATH_PREFIXES)) {
    throw new Error(
      `registerArtLabSlot: appPath must be a canonical, allow-listed path (no traversal, no encoding, no backslash, no absolute or drive prefix): ${record.appPath}`,
    );
  }
  // Reject smuggled kinds — `ArtLabAssetKind` is structurally enforced at
  // compile time, but a caller using `as unknown` or coming from untyped JSON
  // can punch a hole through it. Guard at runtime.
  if (!(ARTLAB_ASSET_KINDS as readonly string[]).includes(record.kind)) {
    throw new Error(
      `registerArtLabSlot: invalid kind ${JSON.stringify(record.kind)} — must be one of ${ARTLAB_ASSET_KINDS.join(", ")}`,
    );
  }
  dynamicSlots.push(record);
}
