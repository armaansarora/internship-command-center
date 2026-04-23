"use client";

import { useCallback, useEffect, useRef, type JSX } from "react";
import type { MapShape } from "@/lib/situation/outreach-arcs";
import { useRingPulse } from "../rings/useRingPulse";

interface Props {
  shape: MapShape;
  companyNameById: Record<string, string>;
}

const SIZE = 480;
const CENTER = SIZE / 2;
const USER_R = 30;
const OUTER_R = SIZE / 2 - 40;
const NODE_R = 5;

/**
 * Canvas2D renderer for the Situation Map.
 *
 * Draws:
 *   - center "user" node (gold)
 *   - company nodes on the outer ring (positioned by deterministic hash)
 *   - arcs: active (animated amber head traveling along a bezier), draft
 *     (dashed outline), completed (thin faded line, static)
 *
 * Perf: RAF loop runs only when activeCount > 0. Otherwise draws once
 * and idles — quiet rooms don't burn CPU.
 *
 * Empty state: if zero arcs, shows "The Situation Room is quiet." text.
 * No decorative arcs when data is empty — matches partner non-negotiable.
 */
export function SituationMapCanvas({ shape, companyNameById }: Props): JSX.Element {
  void companyNameById;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // Lazy-init on mount via useEffect so the render body stays pure.
  const startTimeRef = useRef<number | null>(null);
  const rings = useRingPulse();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      rings.pulse(e.clientX, e.clientY);
    },
    [rings],
  );

  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up high-DPI canvas.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.scale(dpr, dpr);

    const companyPosById = new Map<string, { x: number; y: number }>();
    for (const c of shape.companies) {
      companyPosById.set(c.id, {
        x: CENTER + Math.cos(c.angle) * OUTER_R,
        y: CENTER + Math.sin(c.angle) * OUTER_R,
      });
    }
    if (shape.cluster) {
      companyPosById.set("cluster", {
        x: CENTER + Math.cos(shape.cluster.angle) * OUTER_R,
        y: CENTER + Math.sin(shape.cluster.angle) * OUTER_R,
      });
    }

    const draw = (elapsedMs: number): void => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Background subtle ring
      ctx.strokeStyle = "rgba(220, 124, 40, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, OUTER_R, 0, Math.PI * 2);
      ctx.stroke();

      if (shape.arcs.length === 0) {
        ctx.fillStyle = "rgba(201, 168, 76, 0.8)";
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, USER_R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#7A5B35";
        ctx.textAlign = "center";
        ctx.fillText("The Situation Room is quiet.", CENTER, CENTER + OUTER_R + 24);
        return;
      }

      // Arcs — drawn BELOW the nodes.
      for (const arc of shape.arcs) {
        const pos = companyPosById.get(arc.fromCompanyId);
        if (!pos) continue;

        // Bezier control point: slight bow toward center for a readable curve.
        const midX = (CENTER + pos.x) / 2;
        const midY = (CENTER + pos.y) / 2;
        const dx = pos.x - CENTER;
        const dy = pos.y - CENTER;
        const len = Math.hypot(dx, dy) || 1;
        const cx = midX - (dy / len) * 30;
        const cy = midY + (dx / len) * 30;

        if (arc.kind === "completed") {
          ctx.strokeStyle = "rgba(111, 178, 111, 0.28)";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER);
          ctx.quadraticCurveTo(cx, cy, pos.x, pos.y);
          ctx.stroke();
        } else if (arc.kind === "draft") {
          ctx.strokeStyle = "rgba(122, 91, 53, 0.42)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER);
          ctx.quadraticCurveTo(cx, cy, pos.x, pos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // active — animated glowing head.
          ctx.strokeStyle = "rgba(240, 160, 80, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER);
          ctx.quadraticCurveTo(cx, cy, pos.x, pos.y);
          ctx.stroke();

          // Head position: t oscillates 0..1..0 in 2400ms.
          const t = ((elapsedMs / 2400) % 1);
          const hx = (1 - t) * (1 - t) * CENTER + 2 * (1 - t) * t * cx + t * t * pos.x;
          const hy = (1 - t) * (1 - t) * CENTER + 2 * (1 - t) * t * cy + t * t * pos.y;
          const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8);
          grad.addColorStop(0, "rgba(240, 160, 80, 0.95)");
          grad.addColorStop(1, "rgba(240, 160, 80, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(hx, hy, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Company nodes
      for (const c of shape.companies) {
        const pos = companyPosById.get(c.id);
        if (!pos) continue;
        ctx.fillStyle = "rgba(253, 243, 232, 0.9)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2);
        ctx.fill();
      }
      if (shape.cluster) {
        const pos = companyPosById.get("cluster")!;
        ctx.fillStyle = "rgba(122, 91, 53, 0.8)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#7A5B35";
        ctx.textAlign = "center";
        ctx.fillText(shape.cluster.label, pos.x, pos.y + 16);
      }

      // User node LAST so it sits on top.
      ctx.strokeStyle = "rgba(201, 168, 76, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, USER_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(201, 168, 76, 0.1)";
      ctx.fill();
    };

    const loop = (now: number): void => {
      const elapsed = now - (startTimeRef.current ?? now);
      draw(elapsed);
      if (shape.activeCount > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    if (shape.activeCount > 0) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      draw(0);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [shape]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      data-situation-map="canvas"
      aria-label={`Situation map — ${shape.arcs.length} outreach${shape.arcs.length === 1 ? "" : "es"} in flight`}
      style={{
        display: "block",
        margin: "0 auto",
        cursor: "pointer",
      }}
    />
  );
}
