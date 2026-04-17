"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback, startTransition, type JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * LobbyBackground — Apple TV Saver-style Ken Burns backgrounds.
 *
 * BUG-010: The lobby should NOT share the skyline with the penthouse.
 *
 * Uses 4 ultra-high-res AI-generated architectural sketches (3840x2560,
 * white pencil on dark navy). Images rotate with smooth crossfades on
 * a 20-second timer. Each image gets a unique slow Ken Burns treatment:
 * gentle zoom + directional pan, like Apple TV's Aerial screensaver.
 *
 * Perf (audit C2): images are now served via next/image, so the optimizer
 * pipes them as WebP/AVIF at viewport resolution from /_next/image. The
 * first image is `priority` (LCP); the rest lazy-load. The previous
 * `new Image()` preload loop has been removed — next/image handles this
 * via `<link rel="preload" as="image">` injection automatically.
 *
 * Atmospheric overlays (vignette, grain, spotlights) layer on top.
 * prefers-reduced-motion: disables Ken Burns, static display only.
 */

const LOBBY_IMAGES = [
  "/lobby/bg-1.jpg",
  "/lobby/bg-2.jpg",
  "/lobby/bg-3.jpg",
  "/lobby/bg-4.jpg",
] as const;

/** Each image gets a unique pan/zoom keyframe for variety. */
const KEN_BURNS_KEYFRAMES: string[] = [
  // 1: Slow zoom in toward center-right, slight upward drift
  `@keyframes kb-0 {
    0%   { transform: scale(1.0)  translate(0%, 0%); }
    100% { transform: scale(1.15) translate(-3%, -2%); }
  }`,
  // 2: Gentle zoom out from upper-left
  `@keyframes kb-1 {
    0%   { transform: scale(1.15) translate(-2%, -1%); }
    100% { transform: scale(1.0)  translate(2%, 1%); }
  }`,
  // 3: Slow pan right with subtle zoom
  `@keyframes kb-2 {
    0%   { transform: scale(1.05) translate(2%, 0%); }
    100% { transform: scale(1.12) translate(-3%, -1%); }
  }`,
  // 4: Drift upward with zoom in
  `@keyframes kb-3 {
    0%   { transform: scale(1.0)  translate(0%, 2%); }
    100% { transform: scale(1.12) translate(1%, -2%); }
  }`,
];

/** Duration of each image's display (matches Ken Burns animation). */
const DISPLAY_DURATION_S = 20;
/** Crossfade overlap duration. */
const CROSSFADE_S = 2.5;

export function LobbyBackground(): JSX.Element {
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3]);

  useEffect(() => {
    const arr = [0, 1, 2, 3];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    startTransition(() => setOrder(arr));
  }, []);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  // Rotation timer — advance to next image every DISPLAY_DURATION_S
  const advanceImage = useCallback(() => {
    setNextIdx((prev) => {
      // If prev is null, compute from currentIdx
      const next = ((prev ?? currentIdx) + 1) % order.length;
      return next;
    });
  }, [currentIdx, order.length]);

  useEffect(() => {
    if (reducedMotion) return; // No rotation in reduced motion
    timerRef.current = setTimeout(advanceImage, DISPLAY_DURATION_S * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIdx, reducedMotion, advanceImage]);

  // When nextIdx is set, wait for crossfade then promote
  useEffect(() => {
    if (nextIdx === null) return;
    const timer = setTimeout(() => {
      setCurrentIdx(nextIdx);
      setNextIdx(null);
    }, CROSSFADE_S * 1000);
    return () => clearTimeout(timer);
  }, [nextIdx]);

  const currentImageIdx = order[currentIdx];
  const nextImageIdx = nextIdx !== null ? order[nextIdx] : null;
  const isCrossfading = nextIdx !== null;

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      {/* ── Inject Ken Burns keyframes ── */}
      <style>{KEN_BURNS_KEYFRAMES.join("\n")}</style>

      {/* ── BASE: Dark foundation (visible before images load) ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 20%, rgba(18, 16, 24, 1) 0%, rgba(8, 7, 14, 1) 100%)",
        }}
      />

      {/* ── CURRENT IMAGE with Ken Burns (next/image, optimized via /_next/image) ── */}
      <div
        key={`bg-${currentIdx}`}
        className="absolute inset-0"
        style={{
          opacity: isCrossfading ? 0 : 0.4,
          transition: isCrossfading
            ? `opacity ${CROSSFADE_S}s ease-in-out`
            : "opacity 1.5s ease-out",
          animation: !reducedMotion
            ? `kb-${currentImageIdx} ${DISPLAY_DURATION_S}s ease-in-out forwards`
            : "none",
          willChange: "transform, opacity",
        }}
      >
        <Image
          src={LOBBY_IMAGES[currentImageIdx]}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={75}
          style={{ objectFit: "cover", objectPosition: "center center" }}
        />
      </div>

      {/* ── NEXT IMAGE (crossfading in) ── */}
      {nextImageIdx !== null && (
        <div
          key={`bg-next-${nextIdx}`}
          className="absolute inset-0"
          style={{
            opacity: 0.4,
            transition: `opacity ${CROSSFADE_S}s ease-in-out`,
            animation: !reducedMotion
              ? `kb-${nextImageIdx} ${DISPLAY_DURATION_S}s ease-in-out forwards`
              : "none",
            willChange: "transform, opacity",
          }}
        >
          <Image
            src={LOBBY_IMAGES[nextImageIdx]}
            alt=""
            fill
            sizes="100vw"
            quality={75}
            style={{ objectFit: "cover", objectPosition: "center center" }}
          />
        </div>
      )}

      {/* ── CEILING SPOTLIGHT: Warm overhead glow ── */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "40%",
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(201, 168, 76, 0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── CENTER SPOTLIGHT: Soft golden focal point ── */}
      <div
        className="absolute"
        style={{
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          height: "55%",
          background:
            "radial-gradient(ellipse 100% 100% at 50% 30%, rgba(201, 168, 76, 0.035) 0%, transparent 60%)",
        }}
      />

      {/* ── AMBIENT GRAIN: Subtle texture overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "150px 150px",
          opacity: 0.35,
          mixBlendMode: "overlay" as const,
        }}
      />

      {/* ── VIGNETTE: Dark edges for depth ── */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 250px 120px rgba(4, 5, 12, 0.75)",
        }}
      />

      {/* ── TOP GRADIENT FADE ── */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "18%",
          background:
            "linear-gradient(to bottom, rgba(8, 7, 14, 0.85) 0%, transparent 100%)",
        }}
      />

      {/* ── BOTTOM GRADIENT FADE ── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "12%",
          background:
            "linear-gradient(to top, rgba(8, 7, 14, 0.65) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
