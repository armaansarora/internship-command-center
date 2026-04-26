/**
 * Shelf-aging computation (pure).
 *
 * Every binder on the Debrief shelf has a physical presence that ages as
 * the shelf fills: dust settles on the left-hand (older) spines,
 * yellowing creeps across the leather as the row gets longer, and once
 * the shelf really fills up a subtle, deterministic lean emerges. These
 * three effects are a pure function of position — given the same shelf
 * and the same slot, a binder always ages the same way.
 *
 * Thresholds are intentionally tuned so an empty-ish shelf shows no
 * aging at all: the room rewards the user for filling it.
 *   - dust kicks in above 5 binders total
 *   - yellowing kicks in above 10 binders total
 *   - lean kicks in above 15 binders total
 *
 * Caps (dust ≤ 0.4, yellowing ≤ 0.5, lean ∈ [-2, 2]) keep the aesthetic
 * from tipping into cartoonish at the high end of the shelf.
 */

export interface BinderAging {
  dust: number;
  yellowing: number;
  leanDeg: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function binderAging(indexFromLeft: number, totalOnShelf: number): BinderAging {
  const dust = totalOnShelf > 5 ? clamp(indexFromLeft / totalOnShelf, 0, 0.4) : 0;
  const yellowing =
    totalOnShelf > 10 ? clamp((indexFromLeft / totalOnShelf) * 0.6, 0, 0.5) : 0;
  const leanDeg = totalOnShelf > 15 ? ((indexFromLeft * 37) % 5) - 2 : 0;
  return { dust, yellowing, leanDeg };
}
