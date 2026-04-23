"use client";

import { createContext, useContext } from "react";

export interface RingPulseHandle {
  /**
   * Emit a radial shockwave from (x, y) — viewport coordinates. The
   * shockwave is drawn by whichever RingPulseController is currently
   * mounted as a context provider.
   *
   * Calling this when no controller is mounted is a no-op.
   */
  pulse(x: number, y: number): void;
}

const noop: RingPulseHandle = { pulse: () => {} };

export const RingPulseContext = createContext<RingPulseHandle>(noop);

/**
 * Access the imperative ring-pulse handle. Returns a no-op handle when
 * no provider is mounted, so callers can call `.pulse(x, y)` unconditionally
 * without null-checking.
 *
 * Used by deadline cards, conflict cards, map nodes, and tube arrivals to
 * flash the Situation Room's ambient rings from the click origin. This is
 * the "rings respond to interaction" provocation made concrete — a partner
 * non-negotiable and not polish.
 */
export function useRingPulse(): RingPulseHandle {
  return useContext(RingPulseContext);
}
