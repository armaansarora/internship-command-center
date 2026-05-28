import { randomUUID } from "node:crypto";
import type { ArtLabAssetType } from "../types";
import { KNOWN_CAST } from "./known-cast";

export interface ChildAssetSpec {
  childId: string;
  assetType: ArtLabAssetType;
  characterHint?: string;
  request: string;
}

export interface BundleSpec {
  bundleId: string;
  source: "with-in-it" | "and-together" | "for" | "room-floor";
  children: ChildAssetSpec[];
  promotionPolicy: "atomic" | "independent";
  links: { childA: string; childB: string; linkType: "shares-style" | "co-appears-in" | "references" }[];
}

const ROOMS: Record<string, ArtLabAssetType> = {
  "war room": "environment",
  lobby: "environment",
  observatory: "environment",
  "writing room": "environment",
  "situation room": "environment",
  "briefing room": "environment",
  "rolodex lounge": "environment",
  penthouse: "environment",
};

function detectRoom(text: string): string | undefined {
  const lower = text.toLowerCase();
  return Object.keys(ROOMS).find((room) => lower.includes(room));
}

function detectCharacterFirstNames(text: string): string[] {
  const found = new Set<string>();
  for (const member of KNOWN_CAST) {
    const pattern = new RegExp(`\\b${member.firstName}\\b`, "i");
    if (pattern.test(text)) found.add(member.firstName);
  }
  return [...found];
}

function child(assetType: ArtLabAssetType, request: string, characterHint?: string): ChildAssetSpec {
  return {
    childId: randomUUID(),
    assetType,
    request,
    characterHint,
  };
}

export function parseBundle(request: string): BundleSpec | null {
  if (/\bwith\s+\w[\w\s]*\s+in\s+it\b/i.test(request)) {
    const room = detectRoom(request);
    const chars = detectCharacterFirstNames(request);
    if (room && chars.length >= 1) {
      const children: ChildAssetSpec[] = [
        child("environment", `${room} background`),
        ...chars.map((c) => child("character", `${c} in ${room}`, c)),
      ];
      return {
        bundleId: randomUUID(),
        source: "with-in-it",
        children,
        promotionPolicy: "atomic",
        links: children.slice(1).map((c) => ({ childA: children[0]!.childId, childB: c.childId, linkType: "co-appears-in" })),
      };
    }
  }

  if (/\bbutton\s+for\s+/i.test(request)) {
    const room = detectRoom(request);
    if (room) {
      const children: ChildAssetSpec[] = [
        child("ui-texture", `button for ${room}`),
        child("environment", `${room} background reference`),
      ];
      return {
        bundleId: randomUUID(),
        source: "for",
        children,
        promotionPolicy: "independent",
        links: [{ childA: children[0]!.childId, childB: children[1]!.childId, linkType: "references" }],
      };
    }
  }

  if (/\bthe\s+([a-z\s]+?)\s+floor\b/i.test(request)) {
    const room = detectRoom(request);
    if (room) {
      const children: ChildAssetSpec[] = [child("environment", `${room} floor background`)];
      return {
        bundleId: randomUUID(),
        source: "room-floor",
        children,
        promotionPolicy: "independent",
        links: [],
      };
    }
  }

  // Catch-all multi-character bundle. Matches "Sol and Mara", "Sol + Otis",
  // "Sol, Mara, Vera", "make Sol Otis Mara" — anything that names 2+ known
  // characters without also naming an environment (the room+character cases
  // above already covered the "with X in it" mixed bundle).
  const chars = detectCharacterFirstNames(request);
  const namedRoom = detectRoom(request);
  if (chars.length >= 2 && !namedRoom) {
    const children = chars.map((c) => child("character", c, c));
    const policy: BundleSpec["promotionPolicy"] = /\bfor\b/i.test(request) ? "independent" : "atomic";
    return {
      bundleId: randomUUID(),
      source: "and-together",
      children,
      promotionPolicy: policy,
      links: children.slice(1).map((c) => ({ childA: children[0]!.childId, childB: c.childId, linkType: "shares-style" })),
    };
  }

  return null;
}

export type BundleAcceptanceErrorCode =
  | "BUNDLE_PARTIAL_ACCEPT"
  | "BUNDLE_MISSING_CHILDREN"
  | "BUNDLE_LINK_DANGLING";

export class BundleAcceptanceError extends Error {
  readonly code: BundleAcceptanceErrorCode;
  constructor(code: BundleAcceptanceErrorCode, message: string) {
    super(message);
    this.name = "BundleAcceptanceError";
    this.code = code;
  }
}

/**
 * Enforce the acceptance invariant for atomic bundles.
 *
 * An "atomic" bundle (`promotionPolicy === "atomic"`) means every child must
 * land together or none at all — partial acceptance is forbidden. This helper
 * validates the bundle structure against an optional `requiredAssetTypes`
 * list and throws `BundleAcceptanceError` with a specific code if the bundle
 * would result in a partial accept.
 *
 * Callers in the production promotion path can use this to reject a corrupted
 * bundle before any child enters the run queue.
 */
export function enforceAtomicBundle(
  bundle: BundleSpec,
  requiredAssetTypes?: readonly ArtLabAssetType[],
): void {
  if (bundle.promotionPolicy !== "atomic") return;

  if (bundle.children.length === 0) {
    throw new BundleAcceptanceError(
      "BUNDLE_MISSING_CHILDREN",
      `atomic bundle ${bundle.bundleId} has no children — partial accept`,
    );
  }

  if (requiredAssetTypes && requiredAssetTypes.length > 0) {
    const present = new Set(bundle.children.map((c) => c.assetType));
    const missing = requiredAssetTypes.filter((t) => !present.has(t));
    if (missing.length > 0) {
      throw new BundleAcceptanceError(
        "BUNDLE_PARTIAL_ACCEPT",
        `atomic bundle ${bundle.bundleId} is missing required assetTypes: ${missing.join(", ")}`,
      );
    }
  }

  // Validate links reference real children — a dangling link in an atomic
  // bundle would silently drop a co-appearance edge in the promotion DAG.
  const childIds = new Set(bundle.children.map((c) => c.childId));
  for (const link of bundle.links) {
    if (!childIds.has(link.childA) || !childIds.has(link.childB)) {
      throw new BundleAcceptanceError(
        "BUNDLE_LINK_DANGLING",
        `atomic bundle ${bundle.bundleId} has dangling link ${link.childA}->${link.childB}`,
      );
    }
  }
}
