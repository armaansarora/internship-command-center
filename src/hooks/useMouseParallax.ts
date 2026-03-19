"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 */
export function useMouseParallax(options: UseMouseParallaxOptions = {}): ParallaxState {
  const { smoothing = 0.08, enabled = true } = options;

  const [state, setState] = useState<ParallaxState>({ x: 0, y: 0 });
  const targetRef = useRef<ParallaxState>({ x: 0, y: 0 });
  const currentRef = useRef<ParallaxState>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

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

  const animate = useCallback(() => {
    if (reducedMotionRef.current || !enabled) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const target = targetRef.current;
    const current = currentRef.current;

    // Lerp toward target
    current.x += (target.x - current.x) * smoothing;
    current.y += (target.y - current.y) * smoothing;

    // Only update state when there's meaningful change (avoid unnecessary re-renders)
    const dx = Math.abs(current.x - state.x);
    const dy = Math.abs(current.y - state.y);
    if (dx > 0.0005 || dy > 0.0005) {
      setState({ x: current.x, y: current.y });
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [smoothing, enabled, state.x, state.y]);

  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate, enabled]);

  return enabled && !reducedMotionRef.current ? state : { x: 0, y: 0 };
}
