/**
 * Floor constants — single source of truth for the building directory.
 *
 * FloorId, Floor interface, and FLOORS array are defined in @/types/ui and
 * re-exported here so feature modules can import from a stable path without
 * depending directly on the UI type barrel.
 */
import type { FloorId, Floor } from "@/types/ui";
import { FLOORS } from "@/types/ui";

export type { FloorId, Floor };
export { FLOORS };

/** Ordered floor IDs from top to bottom (matches physical building). */
export const FLOOR_ORDER: FloorId[] = [
  "PH",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
  "1",
  "L",
];

/** Map route → floorId for active-floor detection. */
export const ROUTE_TO_FLOOR: Record<string, FloorId> = Object.fromEntries(
  FLOORS.map((f) => [f.route, f.id]),
) as Record<string, FloorId>;
