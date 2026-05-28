import type { ArtLabAssetType } from "../types";
import { resolveCanonIdentity } from "../sdk/canon/canon-identity-map";
import { detectAmbiguity, type AmbiguityReasonCode } from "./ambiguity-detector";
import { findCastMember, KNOWN_CAST } from "./known-cast";

export type RouterOutcomeKind = "ambiguous-resolved-or-confident" | "needs-human";

/**
 * The router's `characterId` is the canon `header.id` (e.g. "sol-navarro"),
 * NOT the legacy runtime roleSlug (e.g. "cno"). This is the single contract
 * the rest of the pipeline depends on — run-state.json, brief.json,
 * concept-board.json, promotion target dirs, style-wins memory, and the
 * MCP `generate_status` packId all carry the canon header.id. Callers that
 * still need the roleSlug (legacy visual-assets bundle keys, the SDK
 * legacy-shim) read it off `RouterOutcome.roleSlug`.
 *
 * Routing falls back to the runtime roleSlug only when canon is unreachable
 * (missing dir, malformed YAML); the fallback path emits no telemetry — the
 * canonical async loader is the single source of canon errors.
 */
export interface RouterOutcome {
  kind: RouterOutcomeKind;
  assetType: ArtLabAssetType;
  /** Canon `header.id` (e.g. "sol-navarro"). Persisted in run-state and downstream artifacts. */
  characterId?: string;
  /** Runtime roleSlug (e.g. "cno"). Carried for legacy callers that key on it. */
  roleSlug?: string;
  /** Canon `floorId` (e.g. "rolodex-lounge"). Drives promotion target dirs. */
  floorId?: string;
  displayName?: string;
  reasonCodes: AmbiguityReasonCode[];
  request: string;
  evidence: Array<{ signal: string; weight: number }>;
}

interface RoutedCharacterIdentity {
  characterId: string;       // canon header.id (or roleSlug on canon-load failure)
  roleSlug: string;          // legacy runtime slug
  floorId?: string;          // canon floorId (omitted when canon unreachable)
  displayName: string;
}

/**
 * Resolve a runtime roleSlug (the legacy intake key, e.g. "cno") to the
 * canon header.id (e.g. "sol-navarro") via the sync canon identity map.
 * Falls back to the runtime slug when canon can't be read so the router
 * never throws and the rest of the pipeline degrades to legacy behavior
 * rather than crashing.
 */
function identityForRouterMember(member: { characterId: string; displayName: string }): RoutedCharacterIdentity {
  const canon = resolveCanonIdentity(member.characterId);
  if (canon) {
    return {
      characterId: canon.headerId,
      roleSlug: canon.roleSlug,
      floorId: canon.floorId,
      displayName: canon.displayName || member.displayName,
    };
  }
  return {
    characterId: member.characterId,
    roleSlug: member.characterId,
    displayName: member.displayName,
  };
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
      const id = identityForRouterMember(member);
      evidence.push({ signal: `characterId:${id.characterId}`, weight: 200 });
      return {
        kind: "ambiguous-resolved-or-confident",
        assetType: "character",
        characterId: id.characterId,
        roleSlug: id.roleSlug,
        ...(id.floorId ? { floorId: id.floorId } : {}),
        displayName: id.displayName,
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
      const id = member ? identityForRouterMember(member) : undefined;
      evidence.push({ signal: "style-modifier-disambiguation", weight: 150 });
      return {
        kind: "ambiguous-resolved-or-confident",
        assetType: "character",
        characterId: id?.characterId,
        ...(id?.roleSlug ? { roleSlug: id.roleSlug } : {}),
        ...(id?.floorId ? { floorId: id.floorId } : {}),
        displayName: id?.displayName,
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

  // When ambiguity didn't fire, route to the top mention even if multiple
  // characters scored — e.g. "make Rowan Vale" pulls Rowan (displayName
  // hit, score 100) plus Otis (lastName "Vale", score 45). Without
  // ambiguity reasons (no style modifier, no cross-reference, no equal
  // scores) the higher-scoring mention is the subject. Previously this
  // branch only fired when `mentions.length === 1`, so canon characters
  // sharing a last name silently dropped to the no-character fallback.
  if (ambiguity.mentions.length >= 1) {
    const member = findCastMember(ambiguity.mentions[0]!.characterId);
    const id = member ? identityForRouterMember(member) : undefined;
    return {
      kind: "ambiguous-resolved-or-confident",
      assetType: "character",
      characterId: id?.characterId,
      ...(id?.roleSlug ? { roleSlug: id.roleSlug } : {}),
      ...(id?.floorId ? { floorId: id.floorId } : {}),
      displayName: id?.displayName,
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
