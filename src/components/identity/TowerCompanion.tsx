"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { gsap } from "@/lib/gsap-init";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * TowerCompanion — the owl as the user's always-present familiar. It perches in
 * a corner, idles with a barely-perceptible float, and **glides** to a new perch
 * when `perchIndex` changes (the "flies across the app" motion).
 *
 * PROTOTYPE: single static sprite treated as a puppet — no wing-flap yet. Motion
 * is a calm glide to honour the design system ("slow, organic, barely perceptible;
 * no motion-sickness"). A real flap needs the sprite rigged into layers (Rive /
 * Lottie / ArtLab sprite-animation) — that's the next step. Reduced-motion safe.
 *
 * Scoped to /lobby-pilot for now; the global "follows you everywhere" overlay is
 * the next step once the feel is approved (it would mount in the app shell).
 */
const SIZE = 112;
const MARGIN = 28;

type Corner = "br" | "bl" | "tl" | "tr";
const ORDER: ReadonlyArray<Corner> = ["br", "bl", "tl", "tr"];

function coord(corner: Corner): { x: number; y: number } {
  const right = window.innerWidth - SIZE - MARGIN;
  const bottom = window.innerHeight - SIZE - MARGIN;
  switch (corner) {
    case "br":
      return { x: right, y: bottom };
    case "bl":
      return { x: MARGIN, y: bottom };
    case "tl":
      return { x: MARGIN, y: MARGIN };
    case "tr":
      return { x: right, y: MARGIN };
  }
}

export interface TowerCompanionProps {
  /** Index into the perch order; changing it glides the owl to that corner. */
  perchIndex?: number;
}

export function TowerCompanion({ perchIndex = 0 }: TowerCompanionProps): JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const prevPerch = useRef<number>(perchIndex);
  const idleRef = useRef<gsap.core.Timeline | null>(null);
  const reduce = useReducedMotion();
  const [bubble, setBubble] = useState(false);

  // Place at the initial perch + start the idle float.
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    gsap.set(outer, { ...coord(ORDER[perchIndex % ORDER.length]), rotation: 0 });
    if (reduce) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(inner, { y: -9, duration: 3, ease: "sine.inOut" }, 0).to(
      inner,
      { rotation: 2, duration: 4, ease: "sine.inOut" },
      0,
    );
    idleRef.current = tl;
    return () => {
      tl.kill();
    };
    // Initial placement only; perch changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  // Glide to the new perch when perchIndex changes.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer || prevPerch.current === perchIndex) return;
    prevPerch.current = perchIndex;
    const fromX = gsap.getProperty(outer, "x") as number;
    const fromY = gsap.getProperty(outer, "y") as number;
    const to = coord(ORDER[perchIndex % ORDER.length]);

    if (reduce) {
      gsap.set(outer, { x: to.x, y: to.y });
      return;
    }

    const dir = to.x < fromX ? -1 : 1;
    const apex = Math.min(fromY, to.y) - 76; // lift into an arc
    const tl = gsap.timeline();
    tl.to(outer, { x: to.x, duration: 1.3, ease: "power1.inOut" }, 0)
      .to(outer, { y: apex, duration: 0.62, ease: "power2.out" }, 0)
      .to(outer, { y: to.y, duration: 0.68, ease: "power2.in" }, 0.62)
      .to(outer, { rotation: dir * 8, duration: 0.34, ease: "sine.out" }, 0)
      .to(outer, { rotation: 0, duration: 0.55, ease: "sine.inOut" }, 0.78);
  }, [perchIndex, reduce]);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      <div ref={outerRef} style={{ position: "absolute", top: 0, left: 0, width: SIZE, height: SIZE }}>
        <div ref={innerRef} style={{ position: "relative", width: SIZE, height: SIZE }}>
          {bubble ? (
            <div
              role="status"
              style={{
                position: "absolute",
                bottom: SIZE - 6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 210,
                background: "rgba(28,28,48,0.92)",
                border: "1px solid rgba(201,168,76,0.4)",
                borderRadius: 14,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "#F5F1E8",
                font: "13px/1.5 Satoshi, system-ui, sans-serif",
                padding: "10px 14px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                pointerEvents: "none",
              }}
            >
              Hi — I&rsquo;m your Tower companion. Always here to help.{" "}
              <em style={{ color: "#C9A84C", fontStyle: "normal" }}>(chat coming soon)</em>
            </div>
          ) : null}
          <button
            type="button"
            aria-label="Your Tower companion — say hi"
            onClick={() => {
              setBubble(true);
              window.setTimeout(() => setBubble(false), 3800);
            }}
            style={{
              all: "unset",
              display: "block",
              width: SIZE,
              height: SIZE,
              cursor: "pointer",
              pointerEvents: "auto",
              filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.45))",
            }}
          >
            <Image
              src="/brand/owl-cream.png"
              alt="Your Tower companion, a cream owl"
              width={SIZE}
              height={SIZE}
              priority
              style={{ display: "block" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
