import { FOUNDRY_ASSET_KINDS, type FoundryAssetKind } from "./constants";
import { APP_PATH_PREFIXES, isPathSafeAgainstTraversal } from "./manifest.schema";

export interface FoundrySlotRecord {
  slotId: string;
  appPath: string;
  kind: FoundryAssetKind;
  component: string | null;
  requiresGsap: boolean;
}

const OUTFIT_VARIANTS = ["regular", "summer-light", "winter-layered"] as const;
const POSE_STATES = ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"] as const;

function buildCharacterSlots(characterId: string, dirPart: string, component: string): FoundrySlotRecord[] {
  const slots: FoundrySlotRecord[] = [];
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

const BUILTIN_SLOTS: readonly FoundrySlotRecord[] = [
  ...buildCharacterSlots("otis", "lobby/otis", "OtisCharacter"),
  ...buildCharacterSlots("mara-voss", "penthouse/ceo", "CeoCharacter"),
];

const dynamicSlots: FoundrySlotRecord[] = [];

export const FOUNDRY_SLOT_REGISTRY: readonly FoundrySlotRecord[] = new Proxy([], {
  get(_target, prop) {
    const merged: readonly FoundrySlotRecord[] = [...BUILTIN_SLOTS, ...dynamicSlots];
    const value = (merged as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function" ? value.bind(merged) : value;
  },
}) as unknown as readonly FoundrySlotRecord[];

export function isFoundrySlotRegistered(slotId: string): boolean {
  return BUILTIN_SLOTS.some((s) => s.slotId === slotId) || dynamicSlots.some((s) => s.slotId === slotId);
}

export function resolveFoundrySlot(slotId: string): FoundrySlotRecord | undefined {
  return BUILTIN_SLOTS.find((s) => s.slotId === slotId) ?? dynamicSlots.find((s) => s.slotId === slotId);
}

export function registerFoundrySlot(record: FoundrySlotRecord): void {
  if (isFoundrySlotRegistered(record.slotId)) {
    throw new Error(`registerFoundrySlot: slotId already registered: ${record.slotId}`);
  }
  if (!/^[a-z0-9/_-]+$/.test(record.slotId)) {
    throw new Error(`registerFoundrySlot: invalid slotId format: ${record.slotId}`);
  }
  // Defence-in-depth — the slot registry is the trust anchor for
  // `validateFoundryManifestAgainstSlots`. If we let a caller register a slot
  // whose appPath escapes the allow-list, a matching malicious manifest
  // would then sail through `slot-appath-disagrees` because the registry and
  // manifest agree on the rogue path.
  if (!isPathSafeAgainstTraversal(record.appPath, APP_PATH_PREFIXES)) {
    throw new Error(
      `registerFoundrySlot: appPath must be a canonical, allow-listed path (no traversal, no encoding, no backslash, no absolute or drive prefix): ${record.appPath}`,
    );
  }
  // Reject smuggled kinds — `FoundryAssetKind` is structurally enforced at
  // compile time, but a caller using `as unknown` or coming from untyped JSON
  // can punch a hole through it. Guard at runtime.
  if (!(FOUNDRY_ASSET_KINDS as readonly string[]).includes(record.kind)) {
    throw new Error(
      `registerFoundrySlot: invalid kind ${JSON.stringify(record.kind)} — must be one of ${FOUNDRY_ASSET_KINDS.join(", ")}`,
    );
  }
  dynamicSlots.push(record);
}
