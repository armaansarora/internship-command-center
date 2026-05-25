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
