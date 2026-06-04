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
 * Three visual engines share ONE behaviour layer. GSAP always owns WHERE the owl
 * sits — perch, glide arc, greet bob, hover perk; the chosen engine owns what its
 * BODY does:
 *  - `engine="png"` (default): the single flat sprite as a layered GSAP puppet —
 *    a slow breathe (scale pulse from the feet), greet, hover. No real blink/flap.
 *  - `engine="rive"`: a rigged owl (owl.riv) — breathe / blink / greet via Rive.
 *  - `engine="video"`: a baked, transparent, looping clip (owl-idle.webm for
 *    Chrome/Firefox + an HEVC-alpha owl-idle.mov for Safari/iOS) of the owl
 *    actually breathing and blinking — real body motion, authored with zero rigging.
 *
 * The Rive island is code-split (next/dynamic, ssr:false); both the Rive and the
 * video engine mount only AFTER first paint, with the PNG as the instant
 * placeholder, so neither the WASM nor the video ever competes for LCP. When an
 * engine's asset is missing or fails to load, the PNG (with all the GSAP life)
 * silently stands in. Reduced motion resolves to the designed, fully-lit still and
 * loads neither heavy engine. Scoped to /lobby-pilot.
 */
const RiveOwl = dynamic(() => import("./RiveOwl"), { ssr: false });

const SIZE = 112;
const MARGIN = 28;

// The animation the v1 Rive rig must expose (must match RiveOwl's DEFAULT_ANIMATION
// and the name authored in the Rive editor — case-sensitive).
const EXPECTED_ANIMATION = "Idle";

/**
 * What a heavy engine (Rive or video) is actually doing — surfaced to the host
 * page so a missing/mis-authored asset is visible instead of silently falling back.
 *  - `loading`        — fetching/instantiating the asset
 *  - `live`           — playing (Rive: the expected `Idle` animation is present)
 *  - `missing-idle`   — Rive loaded, but no animation named `Idle` (lists what it found)
 *  - `failed`         — asset missing / failed to load (the PNG owl stands in)
 *  - `reduced-motion` — user prefers reduced motion; the engine never loads, still shown
 */
export type CompanionDiagnostic =
  | { engine: "rive"; phase: "loading" | "failed" | "reduced-motion" }
  | { engine: "rive"; phase: "live" | "missing-idle"; animations: string[]; stateMachines: string[] }
  | { engine: "video"; phase: "loading" | "live" | "failed" | "reduced-motion" };

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
  /** Visual engine: "png" (GSAP puppet), "rive" (rigged owl.riv), or "video" (baked loop). Default "png". */
  engine?: "png" | "rive" | "video";
  /** Path to the rigged owl when engine="rive". Default "/brand/owl.riv". */
  riveSrc?: string;
  /** WebM (VP9 alpha) source when engine="video" — Chrome/Firefox. Default "/brand/owl-idle.webm". */
  videoWebm?: string;
  /** HEVC-alpha .mov source when engine="video" — Safari/iOS (listed first). Default "/brand/owl-idle.mov". */
  videoMov?: string;
  /** Reports what the active heavy engine is doing (for a visible status / debugging). */
  onStatus?: (diagnostic: CompanionDiagnostic) => void;
}

type EngineStatus = "idle" | "ready" | "failed";

export function TowerCompanion({
  perchIndex = 0,
  engine = "png",
  riveSrc = "/brand/owl.riv",
  videoWebm = "/brand/owl-idle.webm",
  videoMov = "/brand/owl-idle.mov",
  onStatus,
}: TowerCompanionProps): JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const greetRef = useRef<HTMLDivElement>(null);
  const breatheRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevPerch = useRef<number>(perchIndex);
  const reduce = useReducedMotion();
  const [bubble, setBubble] = useState(false);
  const [greetSignal, setGreetSignal] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [riveStatus, setRiveStatus] = useState<EngineStatus>("idle");
  const [videoStatus, setVideoStatus] = useState<EngineStatus>("idle");
  const [afterPaint, setAfterPaint] = useState(false);

  // Which heavy engine is mounted, and which is actually visible/playing. A body
  // engine is "visible" only once its asset is live; until then the PNG shows.
  const useRiveEngine = engine === "rive" && !reduce && afterPaint && riveStatus !== "failed";
  const riveVisible = useRiveEngine && riveStatus === "ready";
  const useVideoEngine = engine === "video" && !reduce && afterPaint && videoStatus !== "failed";
  const videoVisible = useVideoEngine && videoStatus === "ready";
  const bodyEngineVisible = riveVisible || videoVisible;

  // Mount the heavy engines only AFTER first paint so the PNG placeholder renders
  // instantly and neither the WASM nor the video competes for LCP.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAfterPaint(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Report what the active heavy engine is up to as conditions change. On (re)entry
  // reset that engine to "idle" so a freshly-dropped asset is retried even after a
  // prior "failed" in the same session.
  useEffect(() => {
    if (engine === "rive") {
      if (reduce) {
        onStatus?.({ engine: "rive", phase: "reduced-motion" });
        return;
      }
      setRiveStatus("idle");
      onStatus?.({ engine: "rive", phase: "loading" });
    } else if (engine === "video") {
      if (reduce) {
        onStatus?.({ engine: "video", phase: "reduced-motion" });
        return;
      }
      setVideoStatus("idle");
      onStatus?.({ engine: "video", phase: "loading" });
    }
  }, [engine, reduce, onStatus]);

  // React can omit the muted *attribute* on first render, which some browsers
  // require set before they'll honour muted autoplay — force it on the element.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = true;
  }, [useVideoEngine]);

  // Backstop: if the video neither starts nor errors within a few seconds (some
  // browsers don't fire `error` on a 404 <source> set), treat it as failed → PNG.
  useEffect(() => {
    if (!useVideoEngine || videoStatus !== "idle") return;
    const t = window.setTimeout(() => {
      setVideoStatus("failed");
      onStatus?.({ engine: "video", phase: "failed" });
    }, 7000);
    return () => window.clearTimeout(t);
  }, [useVideoEngine, videoStatus, onStatus]);

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
  // Runs only when the flat PNG is the body — a Rive/video engine breathes on its
  // own, so the GSAP breathe stands down when one is visible (no double-breathe).
  useEffect(() => {
    const el = breatheRef.current;
    if (!el) return;
    if (reduce || bodyEngineVisible) {
      gsap.killTweensOf(el);
      gsap.set(el, { scale: 1 });
      return;
    }
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(el, { scale: 1.025, duration: 3.4, ease: "sine.inOut" });
    return () => {
      tl.kill();
    };
  }, [reduce, bodyEngineVisible]);

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
                  {/* PNG: instant placeholder, reduced-motion still, and engine fallback. */}
                  <Image
                    src="/brand/owl-cream.png"
                    alt="Your Tower companion, a cream owl"
                    width={SIZE}
                    height={SIZE}
                    priority
                    style={{
                      display: "block",
                      opacity: bodyEngineVisible ? 0 : 1,
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
                        onFail={() => {
                          setRiveStatus("failed");
                          onStatus?.({ engine: "rive", phase: "failed" });
                        }}
                        onContents={({ animations, stateMachines }) => {
                          setRiveStatus("ready");
                          onStatus?.({
                            engine: "rive",
                            phase: animations.includes(EXPECTED_ANIMATION) ? "live" : "missing-idle",
                            animations,
                            stateMachines,
                          });
                        }}
                      />
                    </div>
                  ) : null}
                  {/* Video overlay: a baked transparent breathe/blink loop. The HEVC
                      .mov is listed FIRST so Safari (which supports VP9 but NOT
                      VP9-with-alpha) picks it; WebM serves Chrome/Firefox. */}
                  {useVideoEngine ? (
                    <video
                      ref={videoRef}
                      muted
                      autoPlay
                      loop
                      playsInline
                      poster="/brand/owl-cream.png"
                      onPlaying={() => {
                        setVideoStatus("ready");
                        onStatus?.({ engine: "video", phase: "live" });
                      }}
                      onError={() => {
                        // A per-<source> rejection is how multi-source fallback
                        // works — every non-Safari browser rejects the HEVC .mov
                        // (no alpha/codec) before falling back to the WebM, and
                        // that fires `error` on the <source>, which React routes
                        // here. Only fail the ENGINE once the <video> itself has
                        // exhausted every source (its own MediaError is set).
                        if (videoRef.current?.error) {
                          setVideoStatus("failed");
                          onStatus?.({ engine: "video", phase: "failed" });
                        }
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: SIZE,
                        height: SIZE,
                        objectFit: "contain",
                        display: "block",
                        opacity: videoVisible ? 1 : 0,
                        transition: "opacity 0.35s ease",
                        pointerEvents: "none",
                      }}
                    >
                      <source src={videoMov} type='video/mp4; codecs="hvc1"' />
                      <source src={videoWebm} type="video/webm" />
                    </video>
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
