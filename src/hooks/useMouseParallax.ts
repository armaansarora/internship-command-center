"use client";

import { useEffect, useRef, useState } from "react";

interface ParallaxState {
  /** Normalized X: -0.5 to 0.5 (center = 0) */
  x: number;
  /** Normalized Y: -0.5 to 0.5 (center = 0) */
  y: number;
}

interface UseMouseParallaxOptions {
  /** Smoothing factor (0-1). Higher = more responsive, lower = smoother. Default: 0.08 */
  smoothing?: number;
  /** Whether parallax is enabled. Default: true */
  enabled?: boolean;
}

/**
 * useMouseParallax — tracks normalized mouse position with lerp smoothing.
 *
 * Returns smoothed { x, y } values in range [-0.5, 0.5] centered at screen middle.
 * Uses requestAnimationFrame for smooth 60fps updates.
 * Automatically disables for prefers-reduced-motion.
 *
 * Architecture: RAF loop runs on a stable ref — no callback recreation per frame.
 * State is only set when the lerp delta exceeds the threshold (0.0005),
 * preventing unnecessary React re-renders during idle mouse.
 */
export function useMouseParallax(options: UseMouseParallaxOptions = {}): ParallaxState {
  const { smoothing = 0.08, enabled = true } = options;

  const [state, setState] = useState<ParallaxState>({ x: 0, y: 0 });
  const targetRef = useRef<ParallaxState>({ x: 0, y: 0 });
  const currentRef = useRef<ParallaxState>({ x: 0, y: 0 });
  const publishedRef = useRef<ParallaxState>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);
  const enabledRef = useRef(enabled);
  const smoothingRef = useRef(smoothing);

  // Keep refs in sync with latest prop values
  enabledRef.current = enabled;
  smoothingRef.current = smoothing;

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Single stable RAF loop — never torn down due to state changes
  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      };
    };

    function tick() {
      if (reducedMotionRef.current || !enabledRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const target = targetRef.current;
      const current = currentRef.current;
      const s = smoothingRef.current;

      // Lerp toward target
      current.x += (target.x - current.x) * s;
      current.y += (target.y - current.y) * s;

      // Only update React state when there's meaningful change
      const dx = Math.abs(current.x - publishedRef.current.x);
      const dy = Math.abs(current.y - publishedRef.current.y);
      if (dx > 0.0005 || dy > 0.0005) {
        const next = { x: current.x, y: current.y };
        publishedRef.current = next;
        setState(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  return enabled && !reducedMotionRef.current ? state : { x: 0, y: 0 };
}
