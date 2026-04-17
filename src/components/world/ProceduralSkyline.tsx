"use client";

import { useEffect, useRef, type JSX } from "react";
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
   ───────────────────────────────────────────── */

interface Props {
  floorId: FloorId;
  className?: string;
}

export function ProceduralSkyline({ floorId, className = "" }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef  = useRef<Scene | null>(null);
  const rafRef    = useRef(0);
  const sizeRef   = useRef({ w: 0, h: 0 });
  const reduced   = useReducedMotion();
  const offset    = FLOOR_OFFSETS[floorId];
  const { timeState } = useDayNight();

  const offsetRef = useRef(offset);
  const timeStateRef = useRef(timeState);
  const reducedRef = useRef(reduced);

  useEffect(() => {
    offsetRef.current = offset;
    timeStateRef.current = timeState;
    reducedRef.current = reduced;
  }, [offset, timeState, reduced]);

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
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current  = { w: rect.width, h: rect.height };
      sceneRef.current = generateScene(rect.width, rect.height);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── RAF render loop — delegates all drawing to drawFrame() ──
  useEffect(() => {
    const loop = (t: number) => {
      const canvas = canvasRef.current;
      const scene = sceneRef.current;
      if (!canvas || !scene) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      if (!w || !h) return;

      drawFrame({
        ctx,
        w,
        h,
        t,
        scene,
        timeState: timeStateRef.current,
        offset: offsetRef.current,
        reduced: reducedRef.current,
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
