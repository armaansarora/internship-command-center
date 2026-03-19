"use client";

import { useEffect, useRef, useCallback, type JSX } from "react";
import type { FloorId } from "@/types/ui";
import type { TimeState } from "@/types/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useDayNight } from "./DayNightProvider";

/* ─────────────────────────────────────────────
   PROCEDURAL NYC SKYLINE v4 — Canvas-based renderer

   Features:
   - 3-layer parallax depth (far, mid, near)
   - Recognizable NYC landmark silhouettes
   - Animated window lights with warm/cool variation
   - Time-of-day sky gradients (night/dawn/morning/midday/afternoon/golden_hour/dusk)
   - Twinkling stars (night only, fading at dusk/dawn)
   - Shooting stars (night only)
   - Horizon glow and city light bloom (time-aware)
   - Water/river reflection at bottom (enhanced with mirror reflection)
   - Aviation warning lights on tall buildings
   - Mouse-reactive parallax on all layers
   - Floor-height viewport offset
   - Smooth fog between depth layers
   - Ground-level light pollution glow band
   - Atmospheric floating particles (slow-drifting dust/fireflies)
   - Building mirror reflections in water (bottom 8%)
   - Stronger horizon glow with warm gradient band
   ───────────────────────────────────────────── */

interface Building {
  x: number;
  w: number;
  h: number;
  depth: number;
  windows: Win[];
  roofType: "flat" | "spire" | "stepped" | "dome" | "antenna" | "crown";
  roofH: number;
  baseColor: [number, number, number];
  hasAvLight: boolean;
}

interface Win {
  rx: number; // relative x within building (0-1)
  ry: number; // relative y within building (0-1)
  rw: number;
  rh: number;
  brightness: number;
  speed: number;
  phase: number;
  warm: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  bright: number;
  speed: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  warm: boolean;
}

/** Slow atmospheric floating particle (dust/firefly) — separate from ember particles */
interface AtmoParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  warm: boolean;
}

const FLOOR_OFFSETS: Record<FloorId, number> = {
  PH: 0.0, "7": 0.04, "6": 0.08, "5": 0.12,
  "4": 0.16, "3": 0.20, "2": 0.24, "1": 0.28, L: 0.35,
};

const PARALLAX = [0.006, 0.018, 0.04];

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateScene(w: number, h: number) {
  const r = rng(42);

  // ── STARS ──
  const stars: Star[] = [];
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: r() * w, y: r() * h * 0.45,
      r: 0.3 + r() * 1.8,
      bright: 0.15 + r() * 0.85,
      speed: 0.0008 + r() * 0.004,
      phase: r() * Math.PI * 2,
    });
  }

  // ── BUILDINGS ──
  const buildings: Building[] = [];
  const configs = [
    { depth: 0, count: 65, minH: 0.08, maxH: 0.30, minW: 10, maxW: 32, colors: [[18, 22, 42], [22, 26, 48], [15, 18, 36], [20, 24, 44]] as [number, number, number][] },
    { depth: 1, count: 50, minH: 0.14, maxH: 0.48, minW: 18, maxW: 50, colors: [[22, 26, 50], [28, 32, 58], [20, 24, 46], [25, 28, 52]] as [number, number, number][] },
    { depth: 2, count: 35, minH: 0.20, maxH: 0.60, minW: 25, maxW: 75, colors: [[30, 34, 60], [35, 40, 68], [26, 30, 55], [38, 42, 72]] as [number, number, number][] },
  ];

  for (const cfg of configs) {
    for (let i = 0; i < cfg.count; i++) {
      const bw = cfg.minW + r() * (cfg.maxW - cfg.minW);
      let bh = (cfg.minH + r() * (cfg.maxH - cfg.minH)) * h;
      // Even distribution across viewport with jitter — ensures no gaps
      const slotWidth = (w + 100) / cfg.count;
      const bx = -50 + i * slotWidth + (r() - 0.5) * slotWidth * 0.8;

      // Occasional supertall — more likely in center third of viewport
      const centerFactor = 1 - 2 * Math.abs((bx / w) - 0.5); // 1.0 at center, 0 at edges
      const supertallChance = cfg.depth >= 1 ? 0.05 + centerFactor * 0.08 : 0;
      if (r() < supertallChance) bh *= 1.3 + r() * 0.4;

      const roofTypes: Building["roofType"][] = ["flat", "spire", "stepped", "dome", "antenna", "crown"];
      const roofType = roofTypes[Math.floor(r() * roofTypes.length)] ?? "flat";
      const roofH = roofType === "flat" ? 0 : roofType === "spire" ? 15 + r() * 45 : roofType === "crown" ? 10 + r() * 20 : 6 + r() * 15;

      // Generate windows
      const windows: Win[] = [];
      const cols = Math.max(2, Math.floor(bw / (cfg.depth === 0 ? 5.5 : cfg.depth === 1 ? 7 : 9)));
      const rows = Math.max(3, Math.floor(bh / (cfg.depth === 0 ? 7 : cfg.depth === 1 ? 9 : 11)));

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (r() > 0.42) continue; // ~42% lit (base — scaled at render time)
          const margin = 0.08;
          const cellW = (1 - margin * 2) / cols;
          const cellH = (1 - margin * 2) / rows;
          windows.push({
            rx: margin + col * cellW + cellW * 0.15,
            ry: margin + row * cellH + cellH * 0.1,
            rw: cellW * 0.7,
            rh: cellH * 0.8,
            brightness: 0.35 + r() * 0.65,
            speed: 0.0004 + r() * 0.003,
            phase: r() * Math.PI * 2,
            warm: r() > 0.3,
          });
        }
      }

      buildings.push({
        x: bx, w: bw, h: bh, depth: cfg.depth,
        windows, roofType, roofH,
        baseColor: cfg.colors[Math.floor(r() * cfg.colors.length)] ?? cfg.colors[0],
        hasAvLight: bh > h * 0.35 && r() < 0.4,
      });
    }
  }

  // ── PARTICLES (embers rising from city) ──
  const particles: Particle[] = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: r() * w,
      y: h * 0.5 + r() * h * 0.5,
      vx: (r() - 0.5) * 0.3,
      vy: -(0.15 + r() * 0.45),
      size: 0.8 + r() * 2.2,
      alpha: 0.1 + r() * 0.5,
      life: r() * 400,
      maxLife: 300 + r() * 500,
      warm: r() > 0.3,
    });
  }

  // ── ATMOSPHERIC PARTICLES (slow-drifting dust/fireflies) ──
  const atmoParticles: AtmoParticle[] = [];
  for (let i = 0; i < 20; i++) {
    atmoParticles.push({
      x: r() * w,
      y: r() * h * 0.85,
      vx: (r() - 0.5) * 0.12,
      vy: -(0.04 + r() * 0.10),
      size: 0.5 + r() * 1.2,
      baseAlpha: 0.08 + r() * 0.07, // 0.08 – 0.15 range
      phase: r() * Math.PI * 2,
      speed: 0.0005 + r() * 0.001,
      warm: r() > 0.35, // ~65% warm (gold), ~35% cool (blue-white)
    });
  }

  return { stars, buildings, particles, atmoParticles };
}

// ── COLOR CONFIG BY TIME STATE ──
interface SkyConfig {
  gradientStops: string[];
  starOpacity: number;
  shootingStars: boolean;
  windowLitChance: number; // 0-1 multiplier on the base 42%
  windowWarmBias: number;  // 0-1; 1 = all warm, 0 = all cool
  bloomStrength: number;   // multiplier for city bloom alpha
  horizonR: number;
  horizonG: number;
  horizonB: number;
  horizonA: number;
  cloudAlphaBase: number;
  cloudR: number;
  cloudG: number;
  cloudB: number;
  fogR: number;
  fogG: number;
  fogB: number;
  waterShimmerR: number;
  waterShimmerG: number;
  waterShimmerB: number;
  duskStarOpacity: number; // override for partial star visibility
  groundGlowStrength: number; // 0-1, how strong the ground light pollution is
}

function getSkyConfig(ts: TimeState): SkyConfig {
  switch (ts) {
    case "dawn":
      return {
        gradientStops: ["#1A0A1E", "#3D1540", "#6B2B45", "#B85C40", "#E8A050", "#F0C070"],
        starOpacity: 0.10,
        shootingStars: false,
        windowLitChance: 0.60,
        windowWarmBias: 0.85,
        bloomStrength: 0.5,
        horizonR: 232, horizonG: 120, horizonB: 40, horizonA: 0.18,
        cloudAlphaBase: 0.04,
        cloudR: 180, cloudG: 130, cloudB: 80,
        fogR: 40, fogG: 20, fogB: 15,
        waterShimmerR: 220, waterShimmerG: 140, waterShimmerB: 60,
        duskStarOpacity: 0.10,
        groundGlowStrength: 0.35,
      };
    case "morning":
      return {
        gradientStops: ["#1A3050", "#2A5070", "#4080A0", "#60A0C0", "#80C0E0", "#A0D8F0"],
        starOpacity: 0,
        shootingStars: false,
        windowLitChance: 0.24,
        windowWarmBias: 0.10,
        bloomStrength: 0.15,
        horizonR: 80, horizonG: 160, horizonB: 220, horizonA: 0.10,
        cloudAlphaBase: 0.04,
        cloudR: 200, cloudG: 215, cloudB: 240,
        fogR: 50, fogG: 80, fogB: 110,
        waterShimmerR: 100, waterShimmerG: 160, waterShimmerB: 220,
        duskStarOpacity: 0,
        groundGlowStrength: 0.08,
      };
    case "midday":
      return {
        gradientStops: ["#3060A0", "#4080C0", "#60A0D8", "#80B8E0", "#A0D0F0", "#C0E0F8"],
        starOpacity: 0,
        shootingStars: false,
        windowLitChance: 0.24,
        windowWarmBias: 0.10,
        bloomStrength: 0.10,
        horizonR: 100, horizonG: 180, horizonB: 240, horizonA: 0.08,
        cloudAlphaBase: 0.05,
        cloudR: 220, cloudG: 230, cloudB: 255,
        fogR: 60, fogG: 90, fogB: 120,
        waterShimmerR: 120, waterShimmerG: 180, waterShimmerB: 240,
        duskStarOpacity: 0,
        groundGlowStrength: 0.05,
      };
    case "afternoon":
      return {
        gradientStops: ["#4060A0", "#6080B0", "#8098C0", "#A0B0C8", "#C0C8D0", "#D8D0C0"],
        starOpacity: 0,
        shootingStars: false,
        windowLitChance: 0.24,
        windowWarmBias: 0.20,
        bloomStrength: 0.12,
        horizonR: 200, horizonG: 170, horizonB: 120, horizonA: 0.10,
        cloudAlphaBase: 0.04,
        cloudR: 210, cloudG: 205, cloudB: 195,
        fogR: 70, fogG: 70, fogB: 80,
        waterShimmerR: 180, waterShimmerG: 160, waterShimmerB: 130,
        duskStarOpacity: 0,
        groundGlowStrength: 0.10,
      };
    case "golden_hour":
      return {
        gradientStops: ["#1A1020", "#402030", "#804030", "#C07040", "#E09040", "#F0B060"],
        starOpacity: 0,
        shootingStars: false,
        windowLitChance: 0.60,
        windowWarmBias: 0.90,
        bloomStrength: 0.65,
        horizonR: 240, horizonG: 140, horizonB: 40, horizonA: 0.20,
        cloudAlphaBase: 0.05,
        cloudR: 220, cloudG: 130, cloudB: 60,
        fogR: 50, fogG: 25, fogB: 10,
        waterShimmerR: 240, waterShimmerG: 150, waterShimmerB: 60,
        duskStarOpacity: 0,
        groundGlowStrength: 0.55,
      };
    case "dusk":
      return {
        gradientStops: ["#0A0818", "#1A1030", "#302048", "#483060", "#604070", "#705080"],
        starOpacity: 0.30,
        shootingStars: false,
        windowLitChance: 1.0,
        windowWarmBias: 0.60,
        bloomStrength: 0.75,
        horizonR: 120, horizonG: 60, horizonB: 160, horizonA: 0.14,
        cloudAlphaBase: 0.03,
        cloudR: 60, cloudG: 40, cloudB: 80,
        fogR: 15, fogG: 8, fogB: 25,
        waterShimmerR: 180, waterShimmerG: 120, waterShimmerB: 200,
        duskStarOpacity: 0.30,
        groundGlowStrength: 0.70,
      };
    case "night":
    default:
      return {
        gradientStops: ["#03050C", "#070C1A", "#0E1530", "#141C3A", "#1A2244", "#1E2850"],
        starOpacity: 1.0,
        shootingStars: true,
        windowLitChance: 1.0,
        windowWarmBias: 0.70,
        bloomStrength: 1.0,
        horizonR: 201, horizonG: 168, horizonB: 76, horizonA: 0.12,
        cloudAlphaBase: 0.02,
        cloudR: 40, cloudG: 50, cloudB: 80,
        fogR: 6, fogG: 8, fogB: 18,
        waterShimmerR: 201, waterShimmerG: 168, waterShimmerB: 76,
        duskStarOpacity: 1.0,
        groundGlowStrength: 1.0,
      };
  }
}

interface Props {
  floorId: FloorId;
  className?: string;
}

export function ProceduralSkyline({ floorId, className = "" }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof generateScene> | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouse = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reduced = useReducedMotion();
  const offset = FLOOR_OFFSETS[floorId];
  const { timeState } = useDayNight();

  // Init scene on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w: rect.width, h: rect.height };
      sceneRef.current = generateScene(rect.width, rect.height);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Render — re-created when timeState, offset, or reduced changes
  const render = useCallback((t: number) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) { rafRef.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;

    // ── COMPUTE COLOR CONFIG ONCE PER FRAME ──
    const cfg = getSkyConfig(timeState);

    // Smooth mouse
    const lerp = reduced ? 1 : 0.035;
    smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * lerp;
    smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * lerp;
    const mx = smoothMouse.current.x - 0.5;
    const my = smoothMouse.current.y - 0.5;

    ctx.clearRect(0, 0, w, h);

    // ── SKY ──
    const stops = cfg.gradientStops;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    const positions = [0, 0.15, 0.35, 0.55, 0.75, 1.0];
    for (let i = 0; i < stops.length; i++) {
      sky.addColorStop(positions[i] ?? i / (stops.length - 1), stops[i] ?? "#000");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // ── STARS ──
    if (cfg.starOpacity > 0) {
      for (const s of scene.stars) {
        const twinkle = reduced ? s.bright : s.bright * (0.4 + 0.6 * Math.sin(t * s.speed + s.phase));
        const finalAlpha = twinkle * cfg.starOpacity;
        const sx = s.x + mx * w * 0.004;
        const sy = s.y + my * h * 0.002;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 225, 215, ${finalAlpha})`;
        ctx.fill();
        if (s.r > 1.2) {
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 4);
          g.addColorStop(0, `rgba(230, 225, 215, ${finalAlpha * 0.2})`);
          g.addColorStop(1, "rgba(230, 225, 215, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── SHOOTING STARS (night only) ──
    if (!reduced && cfg.shootingStars) {
      const starPeriod = 8000;
      const starPhase = (t % starPeriod) / starPeriod;
      if (starPhase < 0.06) {
        const progress = starPhase / 0.06;
        const seed = Math.floor(t / starPeriod);
        const sx = ((seed * 137) % 100) / 100 * w * 0.7 + w * 0.1;
        const sy = ((seed * 97) % 100) / 100 * h * 0.25 + h * 0.02;
        const angle = 0.4 + ((seed * 53) % 100) / 100 * 0.4;
        const len = 80 + ((seed * 71) % 60);
        const ex = sx + Math.cos(angle) * len * progress;
        const ey = sy + Math.sin(angle) * len * progress;
        const tailLen = len * 0.6;
        const tx = ex - Math.cos(angle) * tailLen;
        const ty = ey - Math.sin(angle) * tailLen;

        const alpha = progress < 0.3 ? progress / 0.3 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
        const grad = ctx.createLinearGradient(tx, ty, ex, ey);
        grad.addColorStop(0, "rgba(255, 255, 255, 0)");
        grad.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.9})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 6);
        hg.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
        hg.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── STAR CONSTELLATIONS (faint connecting lines — only when stars visible) ──
    if (!reduced && cfg.starOpacity > 0) {
      const brightStars = scene.stars.filter(s => s.r > 1.0 && s.bright > 0.5);
      for (let i = 0; i < brightStars.length; i++) {
        const a = brightStars[i];
        for (let j = i + 1; j < brightStars.length; j++) {
          const b = brightStars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 30) {
            const lineAlpha = 0.04 * (1 - dist / 120) * Math.min(a.bright, b.bright) * cfg.starOpacity;
            const twinkle = 0.5 + 0.5 * Math.sin(t * 0.0005 + i * 0.7);
            ctx.beginPath();
            ctx.moveTo(a.x + mx * w * 0.004, a.y + my * h * 0.002);
            ctx.lineTo(b.x + mx * w * 0.004, b.y + my * h * 0.002);
            ctx.strokeStyle = `rgba(200, 210, 240, ${lineAlpha * twinkle})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    // ── DISTANT LIGHTNING (night only) ──
    if (!reduced && timeState === "night") {
      const lightningPeriod = 15000;
      const lightningPhase = (t % lightningPeriod) / lightningPeriod;
      const flash1 = lightningPhase > 0.0 && lightningPhase < 0.008;
      const flash2 = lightningPhase > 0.012 && lightningPhase < 0.018;
      if (flash1 || flash2) {
        const seed = Math.floor(t / lightningPeriod);
        const lx = ((seed * 173) % 100) / 100 * w * 0.6 + w * 0.2;
        const flashAlpha = flash1 ? 0.06 : 0.03;
        const lg = ctx.createRadialGradient(lx, h * 0.35, 0, lx, h * 0.35, w * 0.3);
        lg.addColorStop(0, `rgba(200, 210, 255, ${flashAlpha})`);
        lg.addColorStop(0.3, `rgba(180, 190, 240, ${flashAlpha * 0.5})`);
        lg.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, w, h * 0.7);
      }
    }

    // ── DRIFTING CLOUD WISPS ──
    if (!reduced) {
      ctx.globalAlpha = 1;
      for (let c = 0; c < 4; c++) {
        const cloudY = h * (0.08 + c * 0.09);
        const cloudSpeed = 0.008 + c * 0.003;
        const cloudX = ((t * cloudSpeed + c * w * 0.3) % (w * 1.5)) - w * 0.25;
        const cloudW = w * (0.2 + c * 0.05);
        const cloudH = 25 + c * 10;
        const cloudAlpha = cfg.cloudAlphaBase + c * 0.005;

        const cg = ctx.createRadialGradient(
          cloudX + cloudW / 2, cloudY, 0,
          cloudX + cloudW / 2, cloudY, cloudW / 2
        );
        cg.addColorStop(0, `rgba(${cfg.cloudR}, ${cfg.cloudG}, ${cfg.cloudB}, ${cloudAlpha})`);
        cg.addColorStop(0.6, `rgba(${cfg.cloudR}, ${cfg.cloudG}, ${cfg.cloudB}, ${cloudAlpha * 0.5})`);
        cg.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = cg;
        ctx.fillRect(cloudX, cloudY - cloudH, cloudW, cloudH * 2);
      }
    }

    // ── ENHANCED HORIZON GLOW ──
    // Primary wide radial glow
    const hy = h * (0.58 + offset * 0.25);
    const hg = ctx.createRadialGradient(w / 2, hy, 0, w / 2, hy, w * 0.65);
    hg.addColorStop(0, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${cfg.horizonA * 1.4})`);
    hg.addColorStop(0.25, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${cfg.horizonA * 0.8})`);
    hg.addColorStop(0.55, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${cfg.horizonA * 0.2})`);
    hg.addColorStop(0.8, "rgba(80, 90, 140, 0.02)");
    hg.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

    // Warm gradient band at horizon line — the zone where sky meets buildings
    const horizonBandY = h * (0.52 + offset * 0.2);
    const warmBand = ctx.createLinearGradient(0, horizonBandY - h * 0.12, 0, horizonBandY + h * 0.1);
    warmBand.addColorStop(0, "rgba(0, 0, 0, 0)");
    warmBand.addColorStop(0.4, `rgba(${cfg.horizonR}, ${Math.floor(cfg.horizonG * 0.7)}, ${Math.floor(cfg.horizonB * 0.3)}, ${cfg.horizonA * 0.35})`);
    warmBand.addColorStop(0.6, `rgba(${cfg.horizonR}, ${Math.floor(cfg.horizonG * 0.6)}, ${Math.floor(cfg.horizonB * 0.2)}, ${cfg.horizonA * 0.25})`);
    warmBand.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = warmBand;
    ctx.fillRect(0, horizonBandY - h * 0.12, w, h * 0.22);

    // ── BUILDINGS BY DEPTH ──
    for (let d = 0; d <= 2; d++) {
      const layer = scene.buildings.filter((b) => b.depth === d);
      const px = mx * w * PARALLAX[d];
      const py = my * h * PARALLAX[d] * 0.4;
      const vo = offset * h * (d === 0 ? 0.12 : d === 1 ? 0.22 : 0.32);
      const edgeAlpha = d === 0 ? 0.08 : d === 1 ? 0.12 : 0.18;
      const bodyAlpha = d === 0 ? 0.65 : d === 1 ? 0.8 : 0.92;

      ctx.save();
      ctx.translate(px, py + vo);

      for (const b of layer) {
        const by = h - b.h;
        const [cr, cg, cb] = b.baseColor;

        // Body
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${bodyAlpha})`;
        ctx.fillRect(b.x, by, b.w, b.h);

        // Left edge highlight
        ctx.fillStyle = `rgba(120, 130, 180, ${edgeAlpha})`;
        ctx.fillRect(b.x, by, 1.2, b.h);

        // Right edge shadow
        ctx.fillStyle = `rgba(0, 0, 5, ${edgeAlpha * 0.6})`;
        ctx.fillRect(b.x + b.w - 1, by, 1, b.h);

        // ── ROOF ──
        if (b.roofType === "spire") {
          ctx.beginPath();
          ctx.moveTo(b.x + b.w * 0.35, by);
          ctx.lineTo(b.x + b.w * 0.5, by - b.roofH);
          ctx.lineTo(b.x + b.w * 0.65, by);
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${bodyAlpha})`;
          ctx.fill();
          ctx.fillStyle = `rgba(120, 130, 180, ${edgeAlpha})`;
          ctx.fillRect(b.x + b.w * 0.5 - 0.5, by - b.roofH - 12, 1, 12);
        } else if (b.roofType === "stepped") {
          ctx.fillStyle = `rgba(${cr + 3}, ${cg + 3}, ${cb + 5}, ${bodyAlpha})`;
          ctx.fillRect(b.x + b.w * 0.1, by - b.roofH * 0.5, b.w * 0.8, b.roofH * 0.5);
          ctx.fillRect(b.x + b.w * 0.25, by - b.roofH, b.w * 0.5, b.roofH * 0.5);
        } else if (b.roofType === "crown") {
          for (let ci = 0; ci < 5; ci++) {
            const crx = b.x + (ci / 5) * b.w + b.w * 0.05;
            ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${bodyAlpha})`;
            ctx.fillRect(crx, by - b.roofH, b.w * 0.08, b.roofH);
          }
        } else if (b.roofType === "antenna") {
          ctx.fillStyle = `rgba(120, 130, 180, ${edgeAlpha})`;
          ctx.fillRect(b.x + b.w * 0.5 - 0.5, by - b.roofH, 1, b.roofH);
        }

        // Aviation light
        if (b.hasAvLight) {
          const blink = reduced ? 0.5 : (Math.sin(t * 0.003 + b.x * 0.01) > 0.65 ? 0.9 : 0.1);
          ctx.beginPath();
          const lightY = b.roofType === "spire" ? by - b.roofH - 12 : by - b.roofH;
          ctx.arc(b.x + b.w * 0.5, lightY, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 40, 40, ${blink})`;
          ctx.fill();
          const rg = ctx.createRadialGradient(b.x + b.w * 0.5, lightY, 0, b.x + b.w * 0.5, lightY, 8);
          rg.addColorStop(0, `rgba(255, 40, 40, ${blink * 0.25})`);
          rg.addColorStop(1, "rgba(255, 40, 40, 0)");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(b.x + b.w * 0.5, lightY, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── WINDOWS ──
        for (const win of b.windows) {
          // Skip windows based on time-of-day lit-chance
          // Use the window's phase as a stable pseudo-random value
          if (win.phase > cfg.windowLitChance * Math.PI * 2) continue;

          const wx = b.x + win.rx * b.w;
          const wy = by + win.ry * b.h;
          const ww = win.rw * b.w;
          const wh = win.rh * b.h;

          const flicker = reduced ? win.brightness : win.brightness * (0.65 + 0.35 * Math.sin(t * win.speed + win.phase));

          // Warm/cool bias based on time
          const isWarm = win.phase < cfg.windowWarmBias * Math.PI * 2;
          if (isWarm) {
            ctx.fillStyle = flicker > 0.6 ? "#FBBF24" : "#E8C45A";
          } else {
            ctx.fillStyle = flicker > 0.6 ? "#93C5FD" : "#B8D4F0";
          }
          ctx.globalAlpha = flicker;
          ctx.fillRect(wx, wy, ww, wh);

          // Glow on near buildings
          if (d >= 1 && flicker > 0.55) {
            const gcx = wx + ww / 2;
            const gcy = wy + wh / 2;
            const gr = (ww + wh) * (d === 2 ? 1.2 : 0.7);
            const gg = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gr);
            const gc = isWarm ? "255, 190, 80" : "140, 180, 255";
            gg.addColorStop(0, `rgba(${gc}, ${flicker * 0.12})`);
            gg.addColorStop(1, `rgba(${gc}, 0)`);
            ctx.fillStyle = gg;
            ctx.globalAlpha = 1;
            ctx.fillRect(gcx - gr, gcy - gr, gr * 2, gr * 2);
          }
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();

      // Inter-layer fog
      if (d < 2) {
        const fg = ctx.createLinearGradient(0, h * 0.4, 0, h);
        const fa = d === 0 ? 0.12 : 0.06;
        fg.addColorStop(0, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, 0)`);
        fg.addColorStop(0.5, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, ${fa})`);
        fg.addColorStop(1, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, ${fa * 2.5})`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // ── BUILDING REFLECTIONS IN WATER (bottom 8%) ──
    // Mirror the building silhouettes into the water area with blur and reduced opacity
    const reflectionY = h * 0.92;
    const reflectionH = h - reflectionY;
    if (!reduced && reflectionH > 0) {
      ctx.save();
      // Clip to the water reflection zone
      ctx.beginPath();
      ctx.rect(0, reflectionY, w, reflectionH);
      ctx.clip();

      // Draw a blurred, flipped slice of the buildings just above the water line
      // We flip the canvas vertically around the water line and draw with low opacity
      const sourceY = h - reflectionH * 2; // source region start (above water line)
      const sourceH = reflectionH * 2;

      ctx.save();
      ctx.translate(0, reflectionY * 2); // translate to flip point
      ctx.scale(1, -1);                  // flip vertically
      ctx.globalAlpha = 0.15;
      // Draw the canvas onto itself (the buildings region)
      // Since we're working within rAF we draw the already-drawn buildings
      // by re-rendering a simplified block silhouette as reflection
      for (let d = 0; d <= 2; d++) {
        const layer = scene.buildings.filter((b) => b.depth === d);
        const bodyAlpha = d === 0 ? 0.65 : d === 1 ? 0.8 : 0.92;
        for (const b of layer) {
          const by = h - b.h;
          const [cr, cg, cb] = b.baseColor;
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${bodyAlpha * 0.4})`;
          ctx.fillRect(b.x, by, b.w, b.h);
        }
      }
      ctx.restore();

      // Horizontal wavy distortion lines over the reflection
      for (let ri = 0; ri < 8; ri++) {
        const ry = reflectionY + ri * (reflectionH / 8);
        const wavOffset = reduced ? 0 : Math.sin(t * 0.0008 + ri * 1.1) * 4;
        const lineAlpha = 0.06 + 0.03 * Math.sin(t * 0.001 + ri);
        const rg = ctx.createLinearGradient(0, ry, w, ry);
        rg.addColorStop(0, "rgba(0,0,0,0)");
        rg.addColorStop(0.3, `rgba(${cfg.waterShimmerR}, ${cfg.waterShimmerG}, ${cfg.waterShimmerB}, ${lineAlpha})`);
        rg.addColorStop(0.7, `rgba(${cfg.waterShimmerR}, ${cfg.waterShimmerG}, ${cfg.waterShimmerB}, ${lineAlpha})`);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(wavOffset, ry, w, 1);
      }

      ctx.restore();
    }

    // ── WATER REFLECTION (bottom strip overlay) ──
    const waterY = h * 0.92;
    const waterH = h - waterY;
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, "rgba(8, 12, 28, 0.3)");
    wg.addColorStop(0.3, "rgba(8, 12, 28, 0.6)");
    wg.addColorStop(1, "rgba(4, 6, 15, 0.9)");
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, w, waterH);

    // Shimmer lines on water
    const shimmerCount = 30;
    for (let i = 0; i < shimmerCount; i++) {
      const sx = (i / shimmerCount) * w + (reduced ? 0 : Math.sin(t * 0.001 + i * 0.7) * 3);
      const sy = waterY + 4 + (i % 5) * (waterH / 6);
      const sw = 15 + (i % 4) * 8;
      const shimA = reduced ? 0.06 : 0.03 + 0.04 * Math.sin(t * 0.002 + i * 1.3);
      ctx.fillStyle = `rgba(${cfg.waterShimmerR}, ${cfg.waterShimmerG}, ${cfg.waterShimmerB}, ${shimA})`;
      ctx.fillRect(sx, sy, sw, 1);
    }

    // ── BOTTOM FOG ──
    const bf = ctx.createLinearGradient(0, h * 0.7, 0, h);
    bf.addColorStop(0, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, 0)`);
    bf.addColorStop(0.4, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, 0.35)`);
    bf.addColorStop(0.7, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, 0.65)`);
    bf.addColorStop(1, `rgba(${cfg.fogR}, ${cfg.fogG}, ${cfg.fogB}, 0.92)`);
    ctx.fillStyle = bf;
    ctx.fillRect(0, 0, w, h);

    // ── GROUND-LEVEL LIGHT POLLUTION GLOW ──
    // Warm amber/gold horizontal band at the very bottom 10% — city street light spill
    const groundGlowY = h * 0.90;
    const groundGlowStrength = cfg.groundGlowStrength;
    if (groundGlowStrength > 0) {
      // Primary amber glow band
      const ggg = ctx.createLinearGradient(0, groundGlowY, 0, h);
      ggg.addColorStop(0, `rgba(201, 140, 40, 0)`);
      ggg.addColorStop(0.25, `rgba(201, 130, 30, ${groundGlowStrength * 0.06})`);
      ggg.addColorStop(0.55, `rgba(220, 110, 20, ${groundGlowStrength * 0.10})`);
      ggg.addColorStop(0.8, `rgba(200, 100, 15, ${groundGlowStrength * 0.14})`);
      ggg.addColorStop(1, `rgba(180, 90, 10, ${groundGlowStrength * 0.18})`);
      ctx.fillStyle = ggg;
      ctx.fillRect(0, groundGlowY, w, h - groundGlowY);

      // Horizontal spread — wide radial from center bottom
      const glowCenterY = h * 0.97;
      const groundRadial = ctx.createRadialGradient(w / 2, glowCenterY, 0, w / 2, glowCenterY, w * 0.6);
      groundRadial.addColorStop(0, `rgba(220, 150, 40, ${groundGlowStrength * 0.09})`);
      groundRadial.addColorStop(0.4, `rgba(201, 120, 30, ${groundGlowStrength * 0.05})`);
      groundRadial.addColorStop(0.7, `rgba(180, 100, 20, ${groundGlowStrength * 0.02})`);
      groundRadial.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = groundRadial;
      ctx.fillRect(0, groundGlowY, w, h - groundGlowY);

      // Breathing pulse on ground glow
      const breathPulse = reduced ? 0 : 0.015 * Math.sin(t * 0.00035);
      if (Math.abs(breathPulse) > 0.001) {
        const pulseGrad = ctx.createLinearGradient(0, h * 0.88, 0, h);
        pulseGrad.addColorStop(0, "rgba(0,0,0,0)");
        pulseGrad.addColorStop(1, `rgba(201, 140, 40, ${groundGlowStrength * (0.04 + breathPulse)})`);
        ctx.fillStyle = pulseGrad;
        ctx.fillRect(0, h * 0.88, w, h * 0.12);
      }
    }

    // ── CITY BLOOM (breathing, scaled by time) ──
    const breatheBase = reduced ? 0.05 : 0.04 + 0.02 * Math.sin(t * 0.0004);
    const breathe = breatheBase * cfg.bloomStrength;
    const bloom = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, w * 0.45);
    bloom.addColorStop(0, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${breathe})`);
    bloom.addColorStop(0.5, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${breathe * 0.4})`);
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    // ── FLOATING PARTICLES (embers/fireflies) ──
    if (!reduced) {
      for (const p of scene.particles) {
        p.x += p.vx + mx * 0.5;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.y < -10) {
          p.x = Math.random() * w;
          p.y = h * 0.6 + Math.random() * h * 0.35;
          p.life = 0;
          p.alpha = 0.1 + Math.random() * 0.5;
        }

        // Mouse repulsion
        const mxPos = smoothMouse.current.x * w;
        const myPos = smoothMouse.current.y * h;
        const dx = p.x - mxPos;
        const dy = p.y - myPos;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.8;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force * 0.5;
        }

        const lifeRatio = p.life / p.maxLife;
        const fadeAlpha = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1;
        const finalAlpha = p.alpha * fadeAlpha;

        p.x += Math.sin(t * 0.001 + p.life * 0.02) * 0.15;

        const color = p.warm ? `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${finalAlpha})` : `rgba(160, 190, 255, ${finalAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (p.size > 1.2 && finalAlpha > 0.15) {
          const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
          pg.addColorStop(0, p.warm ? `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, ${finalAlpha * 0.15})` : `rgba(160, 190, 255, ${finalAlpha * 0.08})`);
          pg.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── ATMOSPHERIC PARTICLES (slow-drifting dust/fireflies) ──
    if (!reduced) {
      for (const ap of scene.atmoParticles) {
        // Drift upward slowly
        ap.x += ap.vx;
        ap.y += ap.vy;
        ap.x += Math.sin(t * ap.speed + ap.phase) * 0.08;

        // Wrap around edges
        if (ap.y < -5) {
          ap.y = h * 0.85 + Math.random() * h * 0.12;
          ap.x = Math.random() * w;
        }
        if (ap.x < -5) ap.x = w + 4;
        if (ap.x > w + 5) ap.x = -4;

        // Pulse alpha gently
        const pulseAlpha = ap.baseAlpha * (0.6 + 0.4 * Math.sin(t * ap.speed * 3 + ap.phase));

        if (ap.warm) {
          // Warm gold
          ctx.beginPath();
          ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(201, 168, 76, ${pulseAlpha})`;
          ctx.fill();
        } else {
          // Cool blue-white
          ctx.beginPath();
          ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 210, 255, ${pulseAlpha * 0.9})`;
          ctx.fill();
        }
      }
    }

    // ── MOUSE SPOTLIGHT ──
    if (!reduced) {
      const spotX = smoothMouse.current.x * w;
      const spotY = smoothMouse.current.y * h;
      const spotR = w * 0.18;
      const spot = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR);
      spot.addColorStop(0, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, 0.035)`);
      spot.addColorStop(0.4, `rgba(${cfg.horizonR}, ${cfg.horizonG}, ${cfg.horizonB}, 0.015)`);
      spot.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = spot;
      ctx.fillRect(spotX - spotR, spotY - spotR, spotR * 2, spotR * 2);
    }

    // ── BUILDING LIGHT SWEEP ──
    if (!reduced) {
      const sweepPeriod = 10000;
      const sweepPhase = (t % sweepPeriod) / sweepPeriod;
      if (sweepPhase < 0.3) {
        const sweepProgress = sweepPhase / 0.3;
        const sweepSeed = Math.floor(t / sweepPeriod);
        const nearBuildings = scene.buildings.filter(b => b.depth === 2 && b.h > h * 0.25);
        if (nearBuildings.length > 0) {
          const target = nearBuildings[sweepSeed % nearBuildings.length];
          const px = mx * w * PARALLAX[2];
          const py = my * h * PARALLAX[2] * 0.4;
          const vo = offset * h * 0.32;
          const by = h - target.h;
          const sweepY = by + target.h * (1 - sweepProgress);
          const bandH = target.h * 0.08;
          const sweepAlpha = sweepProgress < 0.1 ? sweepProgress / 0.1 : sweepProgress > 0.85 ? (1 - sweepProgress) / 0.15 : 1;
          const sg = ctx.createLinearGradient(0, sweepY - bandH, 0, sweepY + bandH);
          sg.addColorStop(0, "rgba(255, 200, 80, 0)");
          sg.addColorStop(0.4, `rgba(255, 200, 80, ${0.06 * sweepAlpha})`);
          sg.addColorStop(0.6, `rgba(255, 200, 80, ${0.06 * sweepAlpha})`);
          sg.addColorStop(1, "rgba(255, 200, 80, 0)");
          ctx.fillStyle = sg;
          ctx.fillRect(target.x + px, sweepY - bandH + py + vo, target.w, bandH * 2);
        }
      }
    }

    // ── SCAN LINE (HUD effect) ──
    if (!reduced) {
      const scanPeriod = 12000;
      const scanProgress = (t % scanPeriod) / scanPeriod;
      const scanY = scanProgress * h * 1.3 - h * 0.15;
      const scanAlpha = 0.04;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, "rgba(201, 168, 76, 0)");
      scanGrad.addColorStop(0.45, `rgba(201, 168, 76, ${scanAlpha})`);
      scanGrad.addColorStop(0.5, `rgba(201, 168, 76, ${scanAlpha * 1.5})`);
      scanGrad.addColorStop(0.55, `rgba(201, 168, 76, ${scanAlpha})`);
      scanGrad.addColorStop(1, "rgba(201, 168, 76, 0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, w, 60);
    }

    // ── VIGNETTE ──
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(1, "rgba(3, 5, 12, 0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    rafRef.current = requestAnimationFrame(render);
  }, [offset, reduced, timeState]);

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
