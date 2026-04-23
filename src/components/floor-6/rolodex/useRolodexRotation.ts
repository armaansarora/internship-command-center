"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
  type KeyboardEvent,
} from "react";
import { gsap } from "@/lib/gsap-init";

/**
 * Encapsulates the rolodex rotation mechanics.
 *
 *  - Wheel → spring-damped angular velocity (GSAP tween).
 *  - `←` / `→` → step one card (precision).
 *  - Returns the current angle (degrees, clockwise-positive) and handlers.
 *
 * The hook does NOT touch the DOM directly; it hands `angleDeg` back to the
 * component which renders `rotateY(-angleDeg)` on the cylinder. That keeps
 * the hook pure enough to unit-test.
 */
export function useRolodexRotation(cardCount: number) {
  const [angleDeg, setAngleDeg] = useState(0);
  const animRef = useRef<gsap.core.Tween | null>(null);
  const target = useRef({ v: 0 });

  const anglePerCard = cardCount > 0 ? 360 / cardCount : 0;

  const spinTo = useCallback(
    (nextTarget: number) => {
      target.current.v = nextTarget;
      animRef.current?.kill();
      animRef.current = gsap.to(target.current, {
        v: nextTarget,
        duration: 0.55,
        ease: "power2.out",
        onUpdate: () => setAngleDeg(target.current.v),
      });
    },
    [],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (cardCount === 0) return;
      e.preventDefault();
      const delta = (e.deltaY / 120) * anglePerCard * 1.5;
      spinTo(target.current.v + delta);
    },
    [anglePerCard, cardCount, spinTo],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (cardCount === 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        spinTo(target.current.v + anglePerCard);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        spinTo(target.current.v - anglePerCard);
      }
    },
    [anglePerCard, cardCount, spinTo],
  );

  useEffect(() => () => {
    animRef.current?.kill();
  }, []);

  return { angleDeg, onWheel, onKeyDown };
}

/**
 * Returns the card angle (relative to camera center) normalized to (-180, 180].
 * Used to decide which cards are live / virtual.
 */
export function normalizeDelta(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}
