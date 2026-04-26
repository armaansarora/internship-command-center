/**
 * CinematicArrival: pure stage definitions.
 *
 * The cinematic is an aerial-approach-into-lobby sequence composed from the
 * existing world primitives (ProceduralSkyline, LobbyBackground). Keeping
 * the stage list and timings in a pure module makes the whole sequence
 * unit-testable without mounting the DOM, and lets the runtime component
 * stay a thin wrapper that walks this array through a GSAP timeline.
 *
 * Design-doc anchors:
 *   - §1.1  — "CSS + GSAP over the existing world primitives" (no R3F, no video).
 *   - §1.1  — "Apple TV screensavers and Uncharted openings resolve exterior
 *             approach into interior moment."
 *   - §1.6  — "Total cinematic ≤ 8s (cap)."
 *
 * Stage arc (outside → inside):
 *   approach       — aerial pull-in toward the skyline
 *   pan-down       — skyline reveals the Tower, camera tilts downward
 *   lobby-fade-in  — reception-hall lights come up
 *   concierge-land — final warm light lands on the desk (no character yet;
 *                    Otis primitives live elsewhere and are wired in a
 *                    separate task — this beat is "lights-up on the desk")
 *
 * The reduced-motion audience sees none of this: `reducedMotionStages()`
 * returns one zero-duration stage so the outer component fires `onComplete`
 * immediately and the Lobby UI appears without any animation.
 */

export interface ArrivalStage {
  /** Stable identifier used by tests, CSS selectors, and data-stage attrs. */
  id: string;
  /** Human-readable label, announced for a11y on the active stage. */
  label: string;
  /** Duration of this stage, in milliseconds. */
  durationMs: number;
  /** GSAP easing string (no bounce / elastic / back.in — motion discipline). */
  easing: string;
}

/**
 * The canonical arrival sequence. Deterministic: same ids, same order, every run.
 * Total = 1800 + 1800 + 2000 + 1400 = 7000ms (under the 8000ms cap).
 */
export const STAGES: readonly ArrivalStage[] = [
  {
    id: "approach",
    label: "Approaching the Tower",
    durationMs: 1800,
    easing: "power2.out",
  },
  {
    id: "pan-down",
    label: "The Tower rises",
    durationMs: 1800,
    easing: "power2.inOut",
  },
  {
    id: "lobby-fade-in",
    label: "The lobby comes into view",
    durationMs: 2000,
    easing: "power2.inOut",
  },
  {
    id: "concierge-land",
    label: "The reception desk warms",
    durationMs: 1400,
    easing: "power3.out",
  },
] as const;

/**
 * Sum of `durationMs` across a stage array. Pure. Returns 0 on empty input.
 */
export function totalDurationMs(stages: readonly ArrivalStage[]): number {
  let total = 0;
  for (const s of stages) total += s.durationMs;
  return total;
}

/**
 * The single-stage collapsed sequence used under `prefers-reduced-motion`.
 *
 * Returns a fresh array each call so callers can safely mutate their own
 * copy without reaching into module state.
 */
export function reducedMotionStages(): ArrivalStage[] {
  return [
    {
      id: "collapsed",
      label: "",
      durationMs: 0,
      easing: "none",
    },
  ];
}
