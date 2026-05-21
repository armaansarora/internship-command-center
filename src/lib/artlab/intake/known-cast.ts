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
