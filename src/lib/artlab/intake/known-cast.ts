import { SEASON_ONE_CHARACTER_METADATA } from "@/lib/visual-assets/characters";

export interface KnownCastMember {
  characterId: string;
  displayName: string;
  shortLabel: string;
  firstName: string;
  lastName: string;
  title: string;
  space: string;
}

function deriveFirstLast(displayName: string): { firstName: string; lastName: string } {
  const tokens = displayName.split(/\s+/).filter(Boolean);
  const honorifics = new Set(["dr", "dr."]);
  const startIndex = tokens.findIndex((t) => !honorifics.has(t.toLowerCase()));
  const firstName = tokens[startIndex === -1 ? 0 : startIndex] ?? displayName;
  const lastName = tokens.at(-1) ?? displayName;
  return { firstName, lastName };
}

export const KNOWN_CAST: readonly KnownCastMember[] = SEASON_ONE_CHARACTER_METADATA.map((c) => ({
  characterId: c.id,
  displayName: c.displayName,
  shortLabel: c.shortLabel,
  title: c.title,
  space: c.space,
  ...deriveFirstLast(c.displayName),
}));

export function listCastByCharacterId(): Record<string, KnownCastMember> {
  const out: Record<string, KnownCastMember> = {};
  for (const member of KNOWN_CAST) out[member.characterId] = member;
  return out;
}

export function findCastMember(query: string): KnownCastMember | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return KNOWN_CAST.find(
    (c) =>
      c.characterId.toLowerCase() === q ||
      c.displayName.toLowerCase() === q ||
      c.shortLabel.toLowerCase() === q ||
      c.firstName.toLowerCase() === q ||
      c.lastName.toLowerCase() === q,
  );
}

let cachedById: Record<string, KnownCastMember> | null = null;

export interface CastDisplay {
  characterId: string;
  displayName: string; // "Sol Navarro"
  firstName: string;   // "Sol"
  title: string;       // "Chief Operations Officer" or similar
  space: string;       // "Floor 4 — The Situation Room"
}

/**
 * Resolve a characterId (e.g. "cno", "ceo") to a structured display tuple for
 * user-facing rendering. Falls back to a capitalized characterId when the id
 * isn't in the known cast — guarantees a non-empty `displayName` and
 * `firstName` so callers can interpolate without null checks.
 */
export function displayFor(characterId: string | undefined): CastDisplay {
  if (!characterId) {
    return { characterId: "character", displayName: "Character", firstName: "Character", title: "", space: "" };
  }
  if (!cachedById) cachedById = listCastByCharacterId();
  const member = cachedById[characterId];
  if (member) {
    return {
      characterId: member.characterId,
      displayName: member.displayName,
      firstName: member.firstName,
      title: member.title,
      space: member.space,
    };
  }
  const cap = characterId.length > 0 ? characterId[0]!.toUpperCase() + characterId.slice(1) : characterId;
  return { characterId, displayName: cap, firstName: cap, title: "", space: "" };
}
