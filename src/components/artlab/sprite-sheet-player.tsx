"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

export interface SpriteSheetPlayerProps {
  sheet: string;
  fps: number;
  loop: boolean;
  "aria-label"?: string;
  /** Total frames in the sheet; the player advances modulo this count. */
  frameCount?: number;
}

/**
 * Minimal CSS-driven sprite sheet player. The sheet is expected to be a
 * horizontal strip of `frameCount` equal-width frames. The player
 * advances the background-position-x via a `useEffect` interval and
 * respects prefers-reduced-motion by halting the animation entirely.
 */
export function SpriteSheetPlayer(props: SpriteSheetPlayerProps): JSX.Element {
  const { sheet, fps, loop, frameCount = 24 } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const intervalMs = Math.max(16, Math.round(1000 / Math.max(1, fps)));
    const id = window.setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (next >= frameCount) return loop ? 0 : f;
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [fps, frameCount, loop]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={props["aria-label"] ?? "sprite animation"}
      style={{
        width: 100,
        height: 100,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${frameCount * 100}px 100px`,
        backgroundPosition: `-${frame * 100}px 0`,
      }}
      data-frame={frame}
    />
  );
}
