import { SEASON_ONE_CHARACTER_METADATA } from "@/lib/visual-assets/characters";
import { resolveCanonIdentity } from "@/lib/artlab/sdk/canon/canon-identity-map";

export interface KnownCastMember {
  /**
   * Runtime roleSlug — e.g. "cno". This is the legacy `meta.id` from
   * `SEASON_ONE_CHARACTER_METADATA` and the key the visual-assets bundle
   * keys on. NOT the canon header.id. To get the canon header.id (e.g.
   * "sol-navarro") use `resolveCanonIdentity(member.characterId).headerId`.
   */
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
  const direct = KNOWN_CAST.find(
    (c) =>
      c.characterId.toLowerCase() === q ||
      c.displayName.toLowerCase() === q ||
      c.shortLabel.toLowerCase() === q ||
      c.firstName.toLowerCase() === q ||
      c.lastName.toLowerCase() === q,
  );
  if (direct) return direct;
  // Canon header.id passthrough — e.g. `findCastMember("sol-navarro")` must
  // resolve to the cno KnownCastMember. The intake router accepts both
  // forms (header.id and roleSlug) since the explicit `characterId:` query
  // string in production prompts has historically used either spelling.
  const canon = resolveCanonIdentity(query.trim());
  if (canon) {
    return KNOWN_CAST.find((c) => c.characterId === canon.roleSlug);
  }
  return undefined;
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
 * Resolve a characterId (canon header.id like "sol-navarro" OR legacy
 * roleSlug like "cno") to a structured display tuple for user-facing
 * rendering. Falls back to a capitalized characterId when the id isn't in
 * the known cast — guarantees a non-empty `displayName` and `firstName`
 * so callers can interpolate without null checks.
 *
 * The intake router now writes canon `header.id` to run-state, but
 * downstream surfaces (Telegram acks, bot dispatcher, phase notifier) still
 * call `displayFor(state.characterId)`. We must resolve either form to the
 * same display tuple so the user sees "Sol Navarro" regardless of which
 * identifier reached us.
 */
export function displayFor(characterId: string | undefined): CastDisplay {
  if (!characterId) {
    return { characterId: "character", displayName: "Character", firstName: "Character", title: "", space: "" };
  }
  if (!cachedById) cachedById = listCastByCharacterId();
  const direct = cachedById[characterId];
  if (direct) {
    return {
      characterId: direct.characterId,
      displayName: direct.displayName,
      firstName: direct.firstName,
      title: direct.title,
      space: direct.space,
    };
  }
  // Canon header.id passthrough — translate to the equivalent roleSlug and
  // look up the display tuple from KNOWN_CAST.
  const canon = resolveCanonIdentity(characterId);
  if (canon) {
    const member = cachedById[canon.roleSlug];
    if (member) {
      return {
        characterId: member.characterId,
        displayName: member.displayName,
        firstName: member.firstName,
        title: member.title,
        space: member.space,
      };
    }
  }
  const cap = characterId.length > 0 ? characterId[0]!.toUpperCase() + characterId.slice(1) : characterId;
  return { characterId, displayName: cap, firstName: cap, title: "", space: "" };
}
