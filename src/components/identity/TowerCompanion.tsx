"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

import { gsap } from "@/lib/gsap-init";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * TowerCompanion — the owl as the user's always-present familiar. It perches in
 * a corner, idles with life, **glides** to a new perch when `perchIndex` changes
 * (the "flies across the app" motion), greets on click, and perks on hover.
 *
 * Two visual engines share ONE behaviour layer:
 *  - `engine="png"` (default): the single flat sprite treated as a LAYERED GSAP
 *    puppet. Nested transform wrappers keep each channel conflict-free —
 *    outer = glide (position), inner = idle float + sway, hover = perk scale,
 *    greet = one-shot reaction, breathe = slow scale pulse from the feet. No
 *    wing-flap (a true flap needs the rig); everything else reads as alive.
 *  - `engine="rive"`: a rigged owl (owl.riv) driving breathe / blink / greet via
 *    a Rive state machine. GSAP still owns WHERE the owl sits (the glide arc);
 *    Rive only owns what its body does. If the .riv is missing or fails to load,
 *    it falls back to the PNG (which keeps all the GSAP life above).
 *
 * The Rive island is code-split (next/dynamic, ssr:false) and only mounted AFTER
 * first paint, with the PNG as the instant placeholder, so the ~700KB WASM never
 * blocks LCP. Reduced-motion resolves to the designed, fully-lit still (no loops,
 * no greet/hover motion) and never loads Rive at all. Scoped to /lobby-pilot.
 */
const RiveOwl = dynamic(() => import("./RiveOwl"), { ssr: false });

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
  /** Visual engine: "png" (layered GSAP puppet) or "rive" (rigged owl.riv). Default "png". */
  engine?: "png" | "rive";
  /** Path to the rigged owl when engine="rive". Default "/brand/owl.riv". */
  riveSrc?: string;
}

type RiveStatus = "idle" | "ready" | "failed";

export function TowerCompanion({
  perchIndex = 0,
  engine = "png",
  riveSrc = "/brand/owl.riv",
}: TowerCompanionProps): JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const greetRef = useRef<HTMLDivElement>(null);
  const breatheRef = useRef<HTMLDivElement>(null);
  const prevPerch = useRef<number>(perchIndex);
  const reduce = useReducedMotion();
  const [bubble, setBubble] = useState(false);
  const [greetSignal, setGreetSignal] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [riveStatus, setRiveStatus] = useState<RiveStatus>("idle");
  const [afterPaint, setAfterPaint] = useState(false);

  // Mount the Rive island only AFTER first paint so the PNG placeholder renders
  // instantly and the WASM download never competes for LCP.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAfterPaint(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Place at the initial perch + start the idle float (position bob + slow sway).
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    gsap.set(outer, { ...coord(ORDER[perchIndex % ORDER.length]), rotation: 0 });
    if (reduce) {
      gsap.set(inner, { y: 0, rotation: 0 });
      return;
    }
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(inner, { y: -9, duration: 3, ease: "sine.inOut" }, 0).to(
      inner,
      { rotation: 2, duration: 4, ease: "sine.inOut" },
      0,
    );
    return () => {
      tl.kill();
    };
    // Initial placement only; perch changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  // Breathe: a barely-perceptible scale pulse from the feet (belly expand/settle).
  // The signature "alive" beat — slow and organic, honouring the design system.
  useEffect(() => {
    const el = breatheRef.current;
    if (!el) return;
    if (reduce) {
      gsap.set(el, { scale: 1 });
      return;
    }
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(el, { scale: 1.025, duration: 3.4, ease: "sine.inOut" });
    return () => {
      tl.kill();
    };
  }, [reduce]);

  // Greet: a one-shot warm reaction when clicked (small bob + tilt + scale pop).
  useEffect(() => {
    const el = greetRef.current;
    if (!el || greetSignal === 0 || reduce) return;
    gsap.killTweensOf(el);
    const tl = gsap.timeline();
    tl.to(el, { scale: 1.08, rotation: 5, y: -6, duration: 0.2, ease: "back.out(1.7)" }).to(el, {
      scale: 1,
      rotation: 0,
      y: 0,
      duration: 0.6,
      ease: "power2.out",
    });
    return () => {
      tl.kill();
    };
  }, [greetSignal, reduce]);

  // Hover: a gentle perk-up while the pointer is over the owl.
  useEffect(() => {
    const el = hoverRef.current;
    if (!el || reduce) return;
    gsap.to(el, { scale: hovered ? 1.04 : 1, duration: 0.4, ease: "power2.out" });
  }, [hovered, reduce]);

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

  // Use the rigged owl only when asked, motion is allowed, after first paint,
  // and the .riv hasn't failed to load. Otherwise the PNG (with all the GSAP
  // life above) stands in.
  const useRiveEngine = engine === "rive" && !reduce && afterPaint && riveStatus !== "failed";
  const riveVisible = useRiveEngine && riveStatus === "ready";

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
              setGreetSignal((n) => n + 1);
              window.setTimeout(() => setBubble(false), 3800);
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            style={{
              all: "unset",
              display: "block",
              position: "relative",
              width: SIZE,
              height: SIZE,
              cursor: "pointer",
              pointerEvents: "auto",
              filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.45))",
            }}
          >
            {/* Nested transform wrappers — one channel each, no conflicts:
                hover (perk) → greet (one-shot) → breathe (loop, from the feet). */}
            <div ref={hoverRef} style={{ position: "relative", width: SIZE, height: SIZE }}>
              <div ref={greetRef} style={{ position: "relative", width: SIZE, height: SIZE }}>
                <div
                  ref={breatheRef}
                  style={{ position: "relative", width: SIZE, height: SIZE, transformOrigin: "50% 100%" }}
                >
                  {/* PNG: instant placeholder, reduced-motion still, and Rive fallback. */}
                  <Image
                    src="/brand/owl-cream.png"
                    alt="Your Tower companion, a cream owl"
                    width={SIZE}
                    height={SIZE}
                    priority
                    style={{
                      display: "block",
                      opacity: riveVisible ? 0 : 1,
                      transition: "opacity 0.35s ease",
                    }}
                  />
                  {/* Rive overlay: rigged breathe / blink / greet. Fades in over the PNG. */}
                  {useRiveEngine ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: riveVisible ? 1 : 0,
                        transition: "opacity 0.35s ease",
                      }}
                    >
                      <RiveOwl
                        src={riveSrc}
                        size={SIZE}
                        greetSignal={greetSignal}
                        hovered={hovered}
                        onReady={() => setRiveStatus("ready")}
                        onFail={() => setRiveStatus("failed")}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
