"use client";

import { useCallback, useEffect, useRef, type JSX } from "react";
import type { FloorId } from "@/types/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useDayNight } from "./DayNightProvider";
import {
  generateScene,
  drawFrame,
  FLOOR_OFFSETS,
  type Scene,
} from "@/lib/skyline-engine";

/* ─────────────────────────────────────────────
   PROCEDURAL NYC SKYLINE v5 — React wrapper

   All rendering logic lives in skyline-engine.ts (drawFrame).
   This component owns only:
     - canvas ref + DPR resize observer
     - requestAnimationFrame loop
     - day/night + reduced-motion wiring
     - visibility-aware loop pause (audit C4)
   ───────────────────────────────────────────── */

interface Props {
  floorId: FloorId;
  className?: string;
  /**
   * When provided, the render loop reads the camera offset from this ref each
   * frame instead of FLOOR_OFFSETS[floorId]. PersistentWorld uses this to
   * smoothly tween between floor positions during elevator transitions, so
   * the city view literally rises/descends through the building rather than
   * jumping discretely between floor offsets.
   */
  externalOffsetRef?: { current: number };
}

export function ProceduralSkyline({
  floorId,
  className = "",
  externalOffsetRef,
}: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef  = useRef<Scene | null>(null);
  const ctxRef    = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef    = useRef(0);
  const sizeRef   = useRef({ w: 0, h: 0 });
  const reduced   = useReducedMotion();
  const offset    = FLOOR_OFFSETS[floorId];
  const { timeState } = useDayNight();

  const offsetRef = useRef(offset);
  const timeStateRef = useRef(timeState);
  const reducedRef = useRef(reduced);
  const externalOffsetRefRef = useRef(externalOffsetRef);

  useEffect(() => {
    // When an external ref drives the offset, do NOT sync the local ref —
    // the external tween owns the value.
    if (!externalOffsetRef) {
      offsetRef.current = offset;
    }
    timeStateRef.current = timeState;
    reducedRef.current = reduced;
    externalOffsetRefRef.current = externalOffsetRef;
  }, [offset, timeState, reduced, externalOffsetRef]);

  // ── Resize observer: regenerate scene on canvas dimension change ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr  = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
      }
      sizeRef.current  = { w: rect.width, h: rect.height };
      sceneRef.current = generateScene(rect.width, rect.height);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── RAF render loop — uses refs so the loop can run forever without
  // re-creation on each prop change. drawFrame reads timeState/offset/reduced
  // from refs (synced in the effect above), keeping closure-stable.
  const render = useCallback((t: number) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) {
      rafRef.current = requestAnimationFrame(render);
      return;
    }
    const ctx = ctxRef.current ?? canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;

    drawFrame({
      ctx,
      w,
      h,
      t,
      scene,
      timeState: timeStateRef.current,
      offset: externalOffsetRefRef.current?.current ?? offsetRef.current,
      reduced: reducedRef.current,
    });

    rafRef.current = requestAnimationFrame(render);
  }, []);

  // ── Single static frame (one-shot, no loop) for reduced-motion users ──
  const drawStaticFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;
    const ctx = ctxRef.current ?? canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    drawFrame({
      ctx,
      w,
      h,
      t: 0,
      scene,
      timeState: timeStateRef.current,
      offset: externalOffsetRefRef.current?.current ?? offsetRef.current,
      reduced: true,
    });
  }, []);

  // ── RAF lifecycle with visibility pause + reduced-motion bypass (audit C4) ──
  useEffect(() => {
    // prefers-reduced-motion: render one static frame, no loop, no listeners.
    if (reduced) {
      const timer = setTimeout(drawStaticFrame, 0);
      return () => clearTimeout(timer);
    }

    let running = true;

    const start = () => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(render);
    };

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        stop();
      } else if (!running) {
        running = true;
        start();
      }
    };

    // NOTE: previously paused the RAF loop on `tower:transition:start`/`:end`
    // to free the main thread during elevator timelines. With the new
    // persistent-world architecture the canvas is cheap (no regeneration)
    // and pausing it creates a visible jump when transition:end fires
    // mid-offset-tween (the loop wakes and snaps to the current tween
    // value, producing a fidget). The canvas now runs continuously and the
    // offset tween is read each frame, so transitions look smooth.
    document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });

    // Start the loop only if the tab is currently visible.
    if (!document.hidden) {
      start();
    } else {
      running = false;
    }

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [render, reduced, drawStaticFrame]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
