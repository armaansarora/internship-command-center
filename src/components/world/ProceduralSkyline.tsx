"use client";

import { useEffect, useRef, useCallback, type JSX } from "react";
import type { FloorId } from "@/types/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ─────────────────────────────────────────────
   PROCEDURAL NYC SKYLINE — Canvas-based renderer
   
   Renders a living, breathing Manhattan skyline with:
   - Multi-layer parallax buildings at varying depths
   - Animated window lights (random flicker)
   - Stars in the sky (subtle twinkle)
   - Atmospheric fog and light bloom
   - Mouse-reactive parallax on all layers
   - Floor-height-based viewport offset
   ───────────────────────────────────────────── */

/** Building definition for procedural generation */
interface Building {
  x: number;
  width: number;
  height: number;
  /** 0 = far, 1 = mid, 2 = near */
  depth: number;
  windows: WindowLight[];
  roofStyle: "flat" | "spire" | "angled" | "dome" | "antenna";
  roofHeight: number;
  color: string;
  edgeColor: string;
}

interface WindowLight {
  x: number;
  y: number;
  w: number;
  h: number;
  brightness: number;
  flickerSpeed: number;
  flickerOffset: number;
  warmth: number; // 0 = cool white, 1 = warm yellow
}

interface Star {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

/** Floor height offsets — higher floors see more sky */
const FLOOR_OFFSETS: Record<FloorId, number> = {
  PH: 0.0,
  "7": 0.04,
  "6": 0.08,
  "5": 0.12,
  "4": 0.16,
  "3": 0.20,
  "2": 0.24,
  "1": 0.28,
  L: 0.35,
};

/** Parallax multipliers per depth layer */
const PARALLAX_MULT = [0.008, 0.02, 0.04];

/** Color palettes */
const BUILDING_COLORS = {
  far: [
    "rgba(20, 22, 40, 0.7)",
    "rgba(25, 28, 50, 0.65)",
    "rgba(18, 20, 38, 0.75)",
  ],
  mid: [
    "rgba(22, 25, 48, 0.85)",
    "rgba(28, 30, 55, 0.80)",
    "rgba(20, 22, 42, 0.90)",
    "rgba(30, 33, 58, 0.85)",
  ],
  near: [
    "rgba(30, 33, 58, 0.95)",
    "rgba(35, 38, 65, 0.92)",
    "rgba(25, 28, 50, 0.95)",
    "rgba(40, 42, 70, 0.90)",
  ],
};

const EDGE_COLORS = {
  far: "rgba(60, 65, 100, 0.15)",
  mid: "rgba(80, 85, 120, 0.2)",
  near: "rgba(100, 105, 140, 0.25)",
};

const WINDOW_COLORS = [
  "#FBBF24", // warm gold
  "#F0EDE6", // cool white
  "#E8C45A", // soft gold
  "#FDE68A", // pale yellow
  "#FEF3C7", // cream
  "#93C5FD", // cool blue (screens)
];

/** Seeded pseudo-random for deterministic generation */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Generate the full building array (called once) */
function generateBuildings(canvasWidth: number, canvasHeight: number): Building[] {
  const buildings: Building[] = [];
  const rng = seededRandom(42);

  // Depth layers: far (0), mid (1), near (2)
  const layerConfigs = [
    { depth: 0, count: 45, minH: 0.12, maxH: 0.35, minW: 15, maxW: 40, yBase: 0.55 },
    { depth: 1, count: 35, minH: 0.18, maxH: 0.50, minW: 25, maxW: 60, yBase: 0.50 },
    { depth: 2, count: 25, minH: 0.25, maxH: 0.65, minW: 35, maxW: 90, yBase: 0.45 },
  ];

  for (const cfg of layerConfigs) {
    const colorArr =
      cfg.depth === 0
        ? BUILDING_COLORS.far
        : cfg.depth === 1
          ? BUILDING_COLORS.mid
          : BUILDING_COLORS.near;
    const edgeColor =
      cfg.depth === 0
        ? EDGE_COLORS.far
        : cfg.depth === 1
          ? EDGE_COLORS.mid
          : EDGE_COLORS.near;

    for (let i = 0; i < cfg.count; i++) {
      const w = cfg.minW + rng() * (cfg.maxW - cfg.minW);
      const hFrac = cfg.minH + rng() * (cfg.maxH - cfg.minH);
      const h = hFrac * canvasHeight;
      const x = (i / cfg.count) * (canvasWidth + 200) - 100 + (rng() - 0.5) * 60;

      // Iconic tall buildings scattered in mid layer
      let finalH = h;
      if (cfg.depth === 1 && rng() < 0.08) {
        finalH = h * 1.6; // occasional supertall
      }
      if (cfg.depth === 2 && rng() < 0.05) {
        finalH = h * 1.4;
      }

      const roofStyles: Building["roofStyle"][] = ["flat", "spire", "angled", "dome", "antenna"];
      const roofStyle = roofStyles[Math.floor(rng() * roofStyles.length)] ?? "flat";
      const roofHeight = roofStyle === "flat" ? 0 : roofStyle === "spire" ? 20 + rng() * 40 : 8 + rng() * 15;

      // Generate windows
      const windows: WindowLight[] = [];
      const cols = Math.floor(w / (cfg.depth === 0 ? 6 : cfg.depth === 1 ? 7 : 9));
      const rows = Math.floor(finalH / (cfg.depth === 0 ? 8 : cfg.depth === 1 ? 10 : 12));
      const winW = cfg.depth === 0 ? 2 : cfg.depth === 1 ? 3 : 4;
      const winH = cfg.depth === 0 ? 2.5 : cfg.depth === 1 ? 3.5 : 5;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng() > 0.45) continue; // ~45% of windows lit
          const wx = (c + 0.5) * (w / cols) - winW / 2;
          const wy = (r + 0.5) * (finalH / rows) - winH / 2;
          windows.push({
            x: wx,
            y: wy,
            w: winW,
            h: winH,
            brightness: 0.4 + rng() * 0.6,
            flickerSpeed: 0.0005 + rng() * 0.003,
            flickerOffset: rng() * Math.PI * 2,
            warmth: rng(),
          });
        }
      }

      buildings.push({
        x,
        width: w,
        height: finalH,
        depth: cfg.depth,
        windows,
        roofStyle,
        roofHeight,
        color: colorArr[Math.floor(rng() * colorArr.length)] ?? colorArr[0],
        edgeColor,
      });
    }
  }

  return buildings;
}

/** Generate stars */
function generateStars(canvasWidth: number, canvasHeight: number): Star[] {
  const stars: Star[] = [];
  const rng = seededRandom(137);
  const count = 200;

  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * canvasWidth,
      y: rng() * canvasHeight * 0.5, // only in upper half
      radius: 0.3 + rng() * 1.5,
      brightness: 0.2 + rng() * 0.8,
      twinkleSpeed: 0.001 + rng() * 0.004,
      twinkleOffset: rng() * Math.PI * 2,
    });
  }
  return stars;
}

interface ProceduralSkylineProps {
  floorId: FloorId;
  className?: string;
}

export function ProceduralSkyline({ floorId, className = "" }: ProceduralSkylineProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buildingsRef = useRef<Building[]>([]);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reducedMotion = useReducedMotion();

  const floorOffset = FLOOR_OFFSETS[floorId];

  /** Initialize buildings when canvas size changes */
  const initScene = useCallback((w: number, h: number) => {
    // Use a virtual canvas size for building generation to be resolution-independent
    buildingsRef.current = generateBuildings(w, h);
    starsRef.current = generateStars(w, h);
    sizeRef.current = { w, h };
  }, []);

  /** Main render loop */
  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      // Smooth mouse lerp
      const lerpFactor = reducedMotion ? 1 : 0.04;
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * lerpFactor;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * lerpFactor;
      const mx = mouseRef.current.x - 0.5;
      const my = mouseRef.current.y - 0.5;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // ── SKY GRADIENT ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#04060F");
      skyGrad.addColorStop(0.2, "#0A0F1E");
      skyGrad.addColorStop(0.45, "#111832");
      skyGrad.addColorStop(0.65, "#1A2040");
      skyGrad.addColorStop(0.8, "#1E2548");
      skyGrad.addColorStop(1, "#242B52");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // ── STARS ──
      for (const star of starsRef.current) {
        const twinkle = reducedMotion
          ? star.brightness
          : star.brightness * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
        ctx.beginPath();
        ctx.arc(star.x + mx * w * 0.005, star.y + my * h * 0.003, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 237, 230, ${twinkle})`;
        ctx.fill();

        // Glow on brighter stars
        if (star.radius > 1) {
          ctx.beginPath();
          ctx.arc(star.x + mx * w * 0.005, star.y + my * h * 0.003, star.radius * 3, 0, Math.PI * 2);
          const glowGrad = ctx.createRadialGradient(
            star.x + mx * w * 0.005, star.y + my * h * 0.003, 0,
            star.x + mx * w * 0.005, star.y + my * h * 0.003, star.radius * 3
          );
          glowGrad.addColorStop(0, `rgba(240, 237, 230, ${twinkle * 0.3})`);
          glowGrad.addColorStop(1, "rgba(240, 237, 230, 0)");
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }
      }

      // ── DISTANT GLOW (horizon line) ──
      const horizonY = h * (0.55 + floorOffset * 0.3);
      const horizonGlow = ctx.createRadialGradient(
        w / 2, horizonY, 0,
        w / 2, horizonY, w * 0.6
      );
      horizonGlow.addColorStop(0, "rgba(201, 168, 76, 0.08)");
      horizonGlow.addColorStop(0.3, "rgba(201, 168, 76, 0.04)");
      horizonGlow.addColorStop(0.6, "rgba(60, 70, 120, 0.03)");
      horizonGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, w, h);

      // ── BUILDINGS (by depth layer) ──
      for (let depth = 0; depth <= 2; depth++) {
        const layerBuildings = buildingsRef.current.filter((b) => b.depth === depth);
        const parallaxX = mx * w * PARALLAX_MULT[depth];
        const parallaxY = my * h * PARALLAX_MULT[depth] * 0.5;
        const verticalOffset = floorOffset * h * (depth === 0 ? 0.15 : depth === 1 ? 0.25 : 0.35);

        ctx.save();
        ctx.translate(parallaxX, parallaxY + verticalOffset);

        for (const building of layerBuildings) {
          const bx = building.x;
          const by = h - building.height;

          // Building body
          ctx.fillStyle = building.color;
          ctx.fillRect(bx, by, building.width, building.height);

          // Left edge highlight
          ctx.fillStyle = building.edgeColor;
          ctx.fillRect(bx, by, 1.5, building.height);

          // Roof detail
          if (building.roofStyle === "spire") {
            ctx.beginPath();
            ctx.moveTo(bx + building.width * 0.4, by);
            ctx.lineTo(bx + building.width * 0.5, by - building.roofHeight);
            ctx.lineTo(bx + building.width * 0.6, by);
            ctx.fillStyle = building.color;
            ctx.fill();
            // Antenna
            ctx.fillStyle = building.edgeColor;
            ctx.fillRect(bx + building.width * 0.5 - 0.5, by - building.roofHeight - 15, 1, 15);
            // Aviation light
            if (!reducedMotion) {
              const blink = Math.sin(time * 0.003 + building.x) > 0.7 ? 1 : 0.1;
              ctx.beginPath();
              ctx.arc(bx + building.width * 0.5, by - building.roofHeight - 15, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 50, 50, ${blink})`;
              ctx.fill();
            }
          } else if (building.roofStyle === "angled") {
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + building.width * 0.5, by - building.roofHeight);
            ctx.lineTo(bx + building.width, by);
            ctx.fillStyle = building.color;
            ctx.fill();
          } else if (building.roofStyle === "antenna") {
            ctx.fillStyle = building.edgeColor;
            ctx.fillRect(bx + building.width * 0.5 - 0.5, by - building.roofHeight, 1, building.roofHeight);
            const blink = reducedMotion ? 0.5 : (Math.sin(time * 0.002 + building.x * 0.1) > 0.6 ? 0.9 : 0.15);
            ctx.beginPath();
            ctx.arc(bx + building.width * 0.5, by - building.roofHeight, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 50, ${blink})`;
            ctx.fill();
          }

          // ── WINDOW LIGHTS ──
          for (const win of building.windows) {
            const flicker = reducedMotion
              ? win.brightness
              : win.brightness * (0.7 + 0.3 * Math.sin(time * win.flickerSpeed + win.flickerOffset));

            const colorIdx = Math.floor(win.warmth * (WINDOW_COLORS.length - 1));
            const baseColor = WINDOW_COLORS[colorIdx] ?? WINDOW_COLORS[0];

            // Parse the hex color for alpha
            ctx.fillStyle = baseColor;
            ctx.globalAlpha = flicker;
            ctx.fillRect(bx + win.x, by + win.y, win.w, win.h);

            // Window glow
            if (depth >= 1 && flicker > 0.6) {
              const gwx = bx + win.x + win.w / 2;
              const gwy = by + win.y + win.h / 2;
              const glowR = (win.w + win.h) * (depth === 2 ? 1.5 : 0.8);
              const glow = ctx.createRadialGradient(gwx, gwy, 0, gwx, gwy, glowR);
              glow.addColorStop(0, `rgba(255, 200, 100, ${flicker * 0.15})`);
              glow.addColorStop(1, "rgba(255, 200, 100, 0)");
              ctx.fillStyle = glow;
              ctx.globalAlpha = 1;
              ctx.fillRect(gwx - glowR, gwy - glowR, glowR * 2, glowR * 2);
            }
            ctx.globalAlpha = 1;
          }
        }

        ctx.restore();

        // Inter-layer fog
        if (depth < 2) {
          const fogGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
          const fogOpacity = depth === 0 ? 0.15 : 0.08;
          fogGrad.addColorStop(0, `rgba(15, 18, 35, 0)`);
          fogGrad.addColorStop(0.5, `rgba(15, 18, 35, ${fogOpacity})`);
          fogGrad.addColorStop(1, `rgba(15, 18, 35, ${fogOpacity * 2})`);
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // ── BOTTOM FOG (ground level haze) ──
      const bottomFog = ctx.createLinearGradient(0, h * 0.75, 0, h);
      bottomFog.addColorStop(0, "rgba(10, 12, 25, 0)");
      bottomFog.addColorStop(0.5, "rgba(10, 12, 25, 0.4)");
      bottomFog.addColorStop(1, "rgba(10, 12, 25, 0.85)");
      ctx.fillStyle = bottomFog;
      ctx.fillRect(0, 0, w, h);

      // ── CITY LIGHT BLOOM (overall warm glow at horizon) ──
      const bloomGrad = ctx.createRadialGradient(
        w * 0.5, h * 0.65, 0,
        w * 0.5, h * 0.65, w * 0.5
      );
      bloomGrad.addColorStop(0, "rgba(201, 168, 76, 0.06)");
      bloomGrad.addColorStop(0.4, "rgba(201, 168, 76, 0.03)");
      bloomGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, w, h);

      // ── VIGNETTE ──
      const vigGrad = ctx.createRadialGradient(
        w / 2, h / 2, w * 0.25,
        w / 2, h / 2, w * 0.7
      );
      vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      vigGrad.addColorStop(1, "rgba(4, 6, 15, 0.5)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(render);
    },
    [floorOffset, reducedMotion]
  );

  /** Handle resize */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      initScene(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [initScene]);

  /** Mouse tracking */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  /** Start render loop */
  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
