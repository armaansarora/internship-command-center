/**
 * Floor identity registry — single source of truth for the per-floor
 * cosmetic signals that need to stay aligned across the building:
 *
 *   1. Ambient light tint (PersistentWorld cross-fade)
 *   2. Ambient sound bed name (SoundEngine)
 *   3. Station character + the line the character is "doing" when idle
 *      (used by witnessed-handoff and presence-ribbon surfaces)
 *   4. One-word atmospheric mood word (badges, hover copy)
 *
 * Why this exists: PR3 (Council Table) and the per-floor character
 * standoffs read four different copies of "what's on floor X" from
 * scattered files. When VISION-SPEC said "the building should feel
 * like ONE place," the practical version of that is: never let one
 * floor's identity drift between subsystems. Mutating this file in
 * one place updates everything that reads it.
 *
 * Sound mapping lives in `src/lib/sound/engine.ts` (AMBIENT_BED_BY_FLOOR)
 * and is checked against this registry at test time so the two cannot
 * drift apart.
 */

import type { FloorId } from "@/types/ui";

export interface FloorIdentity {
  /** Display name (e.g. "The War Room"). */
  readonly name: string;
  /** Character at the station (e.g. "CRO"). Null for L/Penthouse/etc. */
  readonly characterId: string | null;
  /** Short line describing what the character is doing while idle. */
  readonly idleAction: string;
  /** One-word atmospheric mood used in subtle hover/badge copy. */
  readonly mood: string;
}

/**
 * The canonical identity table. Order matches the physical building (top
 * to bottom). The Lobby is included because the Concierge has presence
 * too; only the ambient-sound mapping skips it.
 */
export const FLOOR_IDENTITY: Record<FloorId, FloorIdentity> = {
  PH: {
    name: "The Penthouse",
    characterId: null,
    idleAction: "The skyline holds the morning briefing.",
    mood: "panoramic",
  },
  "7": {
    name: "The War Room",
    characterId: "CRO",
    idleAction: "The CRO is at the pipeline wall, counting open lanes.",
    mood: "tactical",
  },
  "6": {
    name: "The Rolodex Lounge",
    characterId: "CNO",
    idleAction: "The CNO is at the rolodex, sorting warm names.",
    mood: "warm",
  },
  "5": {
    name: "The Writing Room",
    characterId: "CMO",
    idleAction: "The CMO is at the writing desk, marking a draft.",
    mood: "quiet",
  },
  "4": {
    name: "The Situation Room",
    characterId: "COO",
    idleAction: "The COO is at the calendar wall, watching deadlines.",
    mood: "alert",
  },
  "3": {
    name: "The Briefing Room",
    characterId: "CPO",
    idleAction: "The CPO is at the whiteboard, queueing prep packets.",
    mood: "methodical",
  },
  "2": {
    name: "The Observatory",
    characterId: "CFO",
    idleAction: "The CFO is at the chart desk, watching trends settle.",
    mood: "analytical",
  },
  "1": {
    name: "The C-Suite",
    characterId: "CEO",
    idleAction: "The CEO is at the head of the table, listening.",
    mood: "commanding",
  },
  L: {
    name: "The Lobby",
    characterId: "Otis",
    idleAction: "Otis is at the reception desk.",
    mood: "polished",
  },
};

/**
 * Resolve identity by id with a strict fallback to Penthouse so callers
 * never have to defensively chain `??` after a lookup.
 */
export function getFloorIdentity(id: FloorId | undefined | null): FloorIdentity {
  if (!id) return FLOOR_IDENTITY.PH;
  return FLOOR_IDENTITY[id] ?? FLOOR_IDENTITY.PH;
}
