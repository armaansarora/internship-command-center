import type { ArtLabAssetType } from "../types";
import { detectAmbiguity, type AmbiguityReasonCode } from "./ambiguity-detector";
import { findCastMember, KNOWN_CAST } from "./known-cast";

export type RouterOutcomeKind = "ambiguous-resolved-or-confident" | "needs-human";

export interface RouterOutcome {
  kind: RouterOutcomeKind;
  assetType: ArtLabAssetType;
  characterId?: string;
  displayName?: string;
  reasonCodes: AmbiguityReasonCode[];
  request: string;
  evidence: Array<{ signal: string; weight: number }>;
}

const EXPLICIT_CHARACTER_ID = /\bcharacter[\s-]?id\s*:?\s*([a-z][a-z0-9-]+)\b/i;

const ASSET_TYPE_KEYWORDS: Array<{ pattern: RegExp; assetType: ArtLabAssetType }> = [
  { pattern: /\b(background|environment|skyline|war\s*room|lobby|observatory)\b/i, assetType: "environment" },
  { pattern: /\b(button|panel|texture|knob|ui\s*asset)\b/i, assetType: "ui-texture" },
  { pattern: /\b(prop|object|tool|item)\b/i, assetType: "prop" },
  { pattern: /\b(animation|loop|motion)\b/i, assetType: "animation" },
  { pattern: /\b(icon|glyph)\b/i, assetType: "icon-system" },
  { pattern: /\b(hero|marketing\s*visual|landing\s*image)\b/i, assetType: "marketing-hero" },
  { pattern: /\b(scene|composition)\b/i, assetType: "scene" },
  { pattern: /\b(shader)\b/i, assetType: "shader" },
];

function inferAssetType(request: string, hasExplicitCharacter: boolean): ArtLabAssetType {
  if (hasExplicitCharacter) return "character";
  for (const candidate of ASSET_TYPE_KEYWORDS) {
    if (candidate.pattern.test(request)) return candidate.assetType;
  }
  if (KNOWN_CAST.some((m) => new RegExp(`\\b${m.firstName}\\b`, "i").test(request))) {
    return "character";
  }
  return "character";
}

export function routeRequest(input: { request: string }): RouterOutcome {
  const evidence: RouterOutcome["evidence"] = [];
  const explicit = input.request.match(EXPLICIT_CHARACTER_ID);
  if (explicit) {
    const member = findCastMember(explicit[1] ?? "");
    if (member) {
      evidence.push({ signal: `characterId:${member.characterId}`, weight: 200 });
      return {
        kind: "ambiguous-resolved-or-confident",
        assetType: "character",
        characterId: member.characterId,
        displayName: member.displayName,
        reasonCodes: [],
        request: input.request,
        evidence,
      };
    }
  }

  const ambiguity = detectAmbiguity({ request: input.request });
  if (ambiguity.mentions.length > 0) {
    const top = ambiguity.mentions[0]!;
    evidence.push({ signal: `mention:${top.characterId}`, weight: top.score });
  }

  if (ambiguity.reasonCodes.includes("style-reference-modifier") && ambiguity.mentions.length < 2) {
    return {
      kind: "needs-human",
      assetType: inferAssetType(input.request, false),
      reasonCodes: ambiguity.reasonCodes,
      request: input.request,
      evidence,
    };
  }

  if (ambiguity.reasonCodes.includes("style-reference-modifier") && ambiguity.mentions.length >= 2) {
    const styleRefs = new Set<string>();
    for (const member of KNOWN_CAST) {
      for (const modifier of ["-compatible", "compatible", "style", "envelope", "language", "reference", "look"]) {
        const pattern = new RegExp(`${member.firstName}.{0,30}${modifier}`, "i");
        if (pattern.test(input.request)) styleRefs.add(member.characterId);
      }
    }
    const subject = ambiguity.mentions.find((m) => !styleRefs.has(m.characterId));
    if (subject) {
      const member = findCastMember(subject.characterId);
      evidence.push({ signal: "style-modifier-disambiguation", weight: 150 });
      return {
        kind: "ambiguous-resolved-or-confident",
        assetType: "character",
        characterId: member?.characterId,
        displayName: member?.displayName,
        reasonCodes: ambiguity.reasonCodes.filter((r) => r !== "style-reference-modifier"),
        request: input.request,
        evidence,
      };
    }
    return {
      kind: "needs-human",
      assetType: "character",
      reasonCodes: ambiguity.reasonCodes,
      request: input.request,
      evidence,
    };
  }

  if (ambiguity.ambiguous) {
    return {
      kind: "needs-human",
      assetType: inferAssetType(input.request, ambiguity.mentions.length > 0),
      reasonCodes: ambiguity.reasonCodes,
      request: input.request,
      evidence,
    };
  }

  if (ambiguity.mentions.length === 1) {
    const member = findCastMember(ambiguity.mentions[0]!.characterId);
    return {
      kind: "ambiguous-resolved-or-confident",
      assetType: "character",
      characterId: member?.characterId,
      displayName: member?.displayName,
      reasonCodes: [],
      request: input.request,
      evidence,
    };
  }

  return {
    kind: "ambiguous-resolved-or-confident",
    assetType: inferAssetType(input.request, false),
    reasonCodes: [],
    request: input.request,
    evidence,
  };
}
