import { KNOWN_CAST, type KnownCastMember } from "./known-cast";

export type AmbiguityReasonCode =
  | "style-reference-modifier"
  | "multiple-character-cross-reference"
  | "multiple-equal-scores"
  | "low-confidence";

export interface AmbiguityMention {
  characterId: string;
  matchedToken: string;
  score: number;
}

export interface AmbiguityDetectorResult {
  ambiguous: boolean;
  reasonCodes: AmbiguityReasonCode[];
  mentions: AmbiguityMention[];
  rawRequest: string;
}

const STYLE_MODIFIERS = ["-compatible", "compatible", "style", "envelope", "language", "reference", "look"] as const;
const CROSS_REF_PATTERNS = [/\bfor\s+([A-Z][a-z]+)\b/, /\bas\s+([A-Z][a-z]+)\b/, /\blike\s+([A-Z][a-z]+)\b/];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreCharacterPresence(member: KnownCastMember, request: string): number {
  const tokens: Array<{ value: string; weight: number }> = [
    { value: member.displayName, weight: 100 },
    { value: member.firstName, weight: 60 },
    { value: member.lastName, weight: 45 },
    { value: member.shortLabel, weight: 70 },
    { value: member.characterId, weight: 80 },
  ];
  let best = 0;
  for (const t of tokens) {
    const pattern = new RegExp(`\\b${escapeRegExp(t.value)}\\b`, "i");
    if (pattern.test(request)) best = Math.max(best, t.weight);
  }
  return best;
}

export function detectAmbiguity(input: { request: string }): AmbiguityDetectorResult {
  const reasons = new Set<AmbiguityReasonCode>();
  const mentions: AmbiguityMention[] = [];

  for (const member of KNOWN_CAST) {
    const score = scoreCharacterPresence(member, input.request);
    if (score > 0) mentions.push({ characterId: member.characterId, matchedToken: member.firstName, score });
  }
  mentions.sort((a, b) => b.score - a.score);

  const lower = input.request.toLowerCase();
  for (const modifier of STYLE_MODIFIERS) {
    if (lower.includes(modifier)) {
      const hasStyleAttribution = KNOWN_CAST.some((m) => {
        const namePattern = new RegExp(`${escapeRegExp(m.firstName)}.{0,20}${escapeRegExp(modifier)}`, "i");
        return namePattern.test(input.request);
      });
      if (hasStyleAttribution || mentions.length >= 2) {
        reasons.add("style-reference-modifier");
      }
    }
  }

  if (mentions.length >= 2) {
    for (const pattern of CROSS_REF_PATTERNS) {
      if (pattern.test(input.request)) reasons.add("multiple-character-cross-reference");
    }
  }

  if (mentions.length >= 2 && mentions[0]!.score === mentions[1]!.score) {
    reasons.add("multiple-equal-scores");
  }

  const ambiguous = reasons.size > 0;
  return {
    ambiguous,
    reasonCodes: Array.from(reasons),
    mentions,
    rawRequest: input.request,
  };
}
