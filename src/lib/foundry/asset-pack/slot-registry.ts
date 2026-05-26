import type { FoundryAssetKind } from "./constants";

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
  dynamicSlots.push(record);
}
