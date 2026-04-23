import type { JSX } from "react";
import { FLOORS, type FloorId } from "@/types/ui";

/**
 * R4.8 — Building Directory.
 *
 * A vertical cross-section of the Tower shown in the Lobby between the
 * Concierge conversation and the elevator ride. Nine floors stacked top-to-bottom
 * (PH → L). Each row is either lit (gold dot, full opacity, real floor name)
 * or ghosted (30% opacity, italicised "sealed" label). The unlock signal is
 * computed upstream by `deriveFloorsUnlocked` and passed in as a prop — this
 * component is pure presentation.
 *
 * Visual language — tied to the Tower design tokens:
 *   Primary dark  #1A1A2E  (building silhouette)
 *   Gold accent   #C9A84C  (lit floor indicator)
 *   Ivory text    #F5F1E8  (lit floor labels)
 *
 * The component is a server component by default (no hooks, no client events);
 * it renders the same markup on the server and on the client.
 */

const GOLD = "#C9A84C";
const IVORY = "#F5F1E8";
const LOCKED_OPACITY = 0.3;

/** Render order: top → bottom, matching the physical Tower. */
const RENDER_ORDER: FloorId[] = ["PH", "7", "6", "5", "4", "3", "2", "1", "L"];

interface BuildingDirectoryProps {
  floorsUnlocked: string[];
}

export function BuildingDirectory({
  floorsUnlocked,
}: BuildingDirectoryProps): JSX.Element {
  const unlockedSet = new Set(floorsUnlocked);

  return (
    <aside
      aria-label="Building Directory"
      data-building-directory
      className="flex flex-col gap-0 w-full max-w-xs mx-auto font-[var(--font-satoshi)]"
      style={{
        // Subtle glass background so the cross-section reads as an interior
        // panel, not a floating list.
        background: "rgba(26, 26, 46, 0.72)",
        border: "1px solid rgba(201, 168, 76, 0.18)",
        borderRadius: "8px",
        padding: "14px 18px",
        backdropFilter: "blur(12px)",
      }}
    >
      <h2
        className="text-[11px] font-mono tracking-[0.18em] uppercase mb-2"
        style={{ color: "rgba(245, 241, 232, 0.58)" }}
      >
        The Tower · Directory
      </h2>
      <ol className="flex flex-col gap-[2px]">
        {RENDER_ORDER.map((id) => {
          const floor = FLOORS.find((f) => f.id === id);
          // Guard against a future FLOORS refactor removing an id — if any
          // floor is missing, the directory skips it silently rather than
          // crashing the Lobby.
          if (!floor) return null;
          const isUnlocked = unlockedSet.has(id);
          return (
            <FloorRow
              key={id}
              id={id}
              name={floor.name}
              label={floor.label}
              isUnlocked={isUnlocked}
            />
          );
        })}
      </ol>
    </aside>
  );
}

interface FloorRowProps {
  id: FloorId;
  name: string;
  label: string;
  isUnlocked: boolean;
}

function FloorRow({ id, name, label, isUnlocked }: FloorRowProps): JSX.Element {
  return (
    <li
      data-floor-row={id}
      data-state={isUnlocked ? "unlocked" : "locked"}
      className="flex items-center justify-between gap-3 py-[6px] px-1 border-b last:border-b-0"
      style={{
        opacity: isUnlocked ? 1 : LOCKED_OPACITY,
        borderColor: "rgba(245, 241, 232, 0.06)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Fixed-width floor id in mono so all rows align. */}
        <span
          className="font-mono text-xs tabular-nums w-6 text-right"
          style={{ color: isUnlocked ? IVORY : "rgba(245, 241, 232, 0.8)" }}
        >
          {id}
        </span>
        {/* Floor name in Playfair-adjacent heading voice. */}
        <span
          className="text-sm truncate"
          style={{
            fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
            color: isUnlocked ? IVORY : "rgba(245, 241, 232, 0.75)",
          }}
        >
          {name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isUnlocked ? (
          <>
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: "rgba(201, 168, 76, 0.78)" }}
            >
              {label}
            </span>
            <span
              data-floor-dot
              aria-hidden="true"
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{
                background: GOLD,
                boxShadow: "0 0 6px rgba(201, 168, 76, 0.55)",
              }}
            />
          </>
        ) : (
          <span
            data-floor-locked-label
            className="text-[10px] italic"
            style={{ color: "rgba(245, 241, 232, 0.55)" }}
          >
            sealed
          </span>
        )}
      </div>
    </li>
  );
}
