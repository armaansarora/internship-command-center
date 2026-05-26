import { resolveFoundrySlot } from "./slot-registry";
import type { FoundryAssetPackManifest } from "./manifest.schema";

export type ManifestSlotCheckResult =
  | { ok: true }
  | { ok: false; code: "slot-not-registered" | "slot-appath-disagrees" | "slot-kind-mismatch"; message: string };

export function validateFoundryManifestAgainstSlots(manifest: FoundryAssetPackManifest): ManifestSlotCheckResult {
  const slot = resolveFoundrySlot(manifest.intendedSlot.slotId);
  if (!slot) {
    return {
      ok: false,
      code: "slot-not-registered",
      message: `slot "${manifest.intendedSlot.slotId}" is not in FOUNDRY_SLOT_REGISTRY`,
    };
  }
  if (slot.appPath !== manifest.intendedSlot.appPath) {
    return {
      ok: false,
      code: "slot-appath-disagrees",
      message: `appPath mismatch — registry: ${slot.appPath}, manifest: ${manifest.intendedSlot.appPath}`,
    };
  }
  if (slot.kind !== manifest.kind) {
    return {
      ok: false,
      code: "slot-kind-mismatch",
      message: `slot kind ${slot.kind} does not match manifest kind ${manifest.kind}`,
    };
  }
  return { ok: true };
}
