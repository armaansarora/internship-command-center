import { z } from "zod/v4";

/**
 * FLOOR IDENTITY token contract — the one mark, nine floors.
 *
 * The Tower's identity is a single LOCKED silhouette (The Keystone — see
 * `docs/MARK-SPEC.md`). It never changes shape. Each floor varies only a
 * per-floor ACCENT: the tint of the mark's "soul" light (and any floor glow).
 * `<FloorMark/>` consumes this; the Lobby is the canonical/default.
 *
 * This is the easily-overridable per-floor knob. Accents stay in a deliberately
 * narrow warm-gold family (a narrow palette is itself a premium signal); the
 * Observatory is the single permitted cool "platinum" exception (analytics/night).
 * To re-tint a floor, change its `accent` here — nothing else moves.
 *
 * Floor map mirrors `CLAUDE.md` › Floor Directory, ordered top-down.
 */
export type FloorId = "PH" | "7" | "6" | "5" | "4" | "3" | "2" | "1" | "L";

export const FloorAccentSchema = z
  .object({
    /** Stable floor key (matches the building directory + elevator). */
    id: z.enum(["PH", "7", "6", "5", "4", "3", "2", "1", "L"]),
    /** Short label shown on the elevator / as a chip. */
    label: z.string().min(1).max(3),
    /** Room name (e.g. "The War Room"). */
    name: z.string().min(1),
    /** What the floor is for, in a few words. */
    room: z.string().min(1),
    /** Per-floor accent — the hex tint of the mark's soul light. */
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .strict();

export type FloorAccent = z.infer<typeof FloorAccentSchema>;

export const FloorsSchema = z.array(FloorAccentSchema).length(9);

/**
 * The nine floors, top of the Tower down to the ground. Lobby ("L") is the
 * canonical mark: its accent is the brand cream `#F5F1E8`.
 */
export const FLOORS: readonly FloorAccent[] = [
  { id: "PH", label: "PH", name: "The Penthouse", room: "Dashboard", accent: "#FBE9B0" },
  { id: "7", label: "7", name: "The War Room", room: "Applications & Pipeline", accent: "#DDA94E" },
  { id: "6", label: "6", name: "The Rolodex Lounge", room: "Contacts & Networking", accent: "#E9C987" },
  { id: "5", label: "5", name: "The Writing Room", room: "Cover Letters", accent: "#EFE6CC" },
  { id: "4", label: "4", name: "The Situation Room", room: "Follow-ups & Calendar", accent: "#E6B45A" },
  { id: "3", label: "3", name: "The Briefing Room", room: "Interview Prep", accent: "#EAD9A6" },
  { id: "2", label: "2", name: "The Observatory", room: "Analytics", accent: "#CBD8EC" },
  { id: "1", label: "1", name: "The C-Suite", room: "CEO's Office", accent: "#E8C45A" },
  { id: "L", label: "L", name: "The Lobby", room: "Login & Onboarding", accent: "#F5F1E8" },
] as const;

/** The canonical floor — the Lobby, where the pilot lives. */
export const LOBBY_FLOOR: FloorAccent = FLOORS.find((f) => f.id === "L")!;

const FLOOR_BY_ID: Readonly<Record<FloorId, FloorAccent>> = Object.fromEntries(
  FLOORS.map((f) => [f.id, f]),
) as Record<FloorId, FloorAccent>;

/** Look up a floor by id; falls back to the Lobby for unknown ids. */
export function getFloor(id: FloorId): FloorAccent {
  return FLOOR_BY_ID[id] ?? LOBBY_FLOOR;
}
