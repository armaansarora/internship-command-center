"use client";

import { useEffect, useRef, useCallback, type JSX } from "react";
import type { FloorId } from "@/types/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ─────────────────────────────────────────────
   PROCEDURAL NYC SKYLINE v2 — Canvas-based renderer
   
   Features:
   - 3-layer parallax depth (far, mid, near)
   - Recognizable NYC landmark silhouettes
   - Animated window lights with warm/cool variation
   - Twinkling stars with glow
   - Horizon glow and city light bloom
   - Water/river reflection at bottom
   - Aviation warning lights on tall buildings
   - Mouse-reactive parallax on all layers
   - Floor-height viewport offset
   - Smooth fog between depth layers
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
          if (r() > 0.42) continue; // ~42% lit
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

  return { stars, buildings, particles };
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

  // Render
  const render = useCallback((t: number) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) { rafRef.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;

    // Smooth mouse
    const lerp = reduced ? 1 : 0.035;
    smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * lerp;
    smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * lerp;
    const mx = smoothMouse.current.x - 0.5;
    const my = smoothMouse.current.y - 0.5;

    ctx.clearRect(0, 0, w, h);

    // ── SKY ──
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#03050C");
    sky.addColorStop(0.15, "#070C1A");
    sky.addColorStop(0.35, "#0E1530");
    sky.addColorStop(0.55, "#141C3A");
    sky.addColorStop(0.75, "#1A2244");
    sky.addColorStop(1, "#1E2850");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // ── STARS ──
    for (const s of scene.stars) {
      const twinkle = reduced ? s.bright : s.bright * (0.4 + 0.6 * Math.sin(t * s.speed + s.phase));
      const sx = s.x + mx * w * 0.004;
      const sy = s.y + my * h * 0.002;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 225, 215, ${twinkle})`;
      ctx.fill();
      if (s.r > 1.2) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 4);
        g.addColorStop(0, `rgba(230, 225, 215, ${twinkle * 0.2})`);
        g.addColorStop(1, "rgba(230, 225, 215, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── SHOOTING STARS (occasional) ──
    if (!reduced) {
      // Use time-based trigger — a shooting star appears every ~8 seconds
      const starPeriod = 8000;
      const starPhase = (t % starPeriod) / starPeriod;
      if (starPhase < 0.06) {
        // Active shooting star
        const progress = starPhase / 0.06; // 0 to 1
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

        // Head glow
        const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 6);
        hg.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
        hg.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── HORIZON GLOW ──
    const hy = h * (0.58 + offset * 0.25);
    const hg = ctx.createRadialGradient(w / 2, hy, 0, w / 2, hy, w * 0.55);
    hg.addColorStop(0, "rgba(201, 168, 76, 0.07)");
    hg.addColorStop(0.35, "rgba(180, 140, 60, 0.035)");
    hg.addColorStop(0.7, "rgba(80, 90, 140, 0.02)");
    hg.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

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
          for (let c = 0; c < 5; c++) {
            const cx = b.x + (c / 5) * b.w + b.w * 0.05;
            ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${bodyAlpha})`;
            ctx.fillRect(cx, by - b.roofH, b.w * 0.08, b.roofH);
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
          // Red glow
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
          const wx = b.x + win.rx * b.w;
          const wy = by + win.ry * b.h;
          const ww = win.rw * b.w;
          const wh = win.rh * b.h;

          const flicker = reduced ? win.brightness : win.brightness * (0.65 + 0.35 * Math.sin(t * win.speed + win.phase));

          if (win.warm) {
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
            const gc = win.warm ? "255, 190, 80" : "140, 180, 255";
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
        fg.addColorStop(0, "rgba(12, 16, 32, 0)");
        fg.addColorStop(0.5, `rgba(12, 16, 32, ${fa})`);
        fg.addColorStop(1, `rgba(12, 16, 32, ${fa * 2.5})`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // ── WATER REFLECTION (bottom strip) ──
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
      ctx.fillStyle = `rgba(201, 168, 76, ${shimA})`;
      ctx.fillRect(sx, sy, sw, 1);
    }

    // ── BOTTOM FOG ──
    const bf = ctx.createLinearGradient(0, h * 0.7, 0, h);
    bf.addColorStop(0, "rgba(6, 8, 18, 0)");
    bf.addColorStop(0.4, "rgba(6, 8, 18, 0.35)");
    bf.addColorStop(0.7, "rgba(6, 8, 18, 0.65)");
    bf.addColorStop(1, "rgba(6, 8, 18, 0.92)");
    ctx.fillStyle = bf;
    ctx.fillRect(0, 0, w, h);

    // ── CITY BLOOM (breathing) ──
    const breathe = reduced ? 0.05 : 0.04 + 0.02 * Math.sin(t * 0.0004);
    const bloom = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, w * 0.45);
    bloom.addColorStop(0, `rgba(201, 168, 76, ${breathe})`);
    bloom.addColorStop(0.5, `rgba(160, 130, 60, ${breathe * 0.4})`);
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    // ── FLOATING PARTICLES (embers/fireflies) ──
    if (!reduced) {
      for (const p of scene.particles) {
        p.x += p.vx + mx * 0.5;
        p.y += p.vy;
        p.life++;

        // Respawn at bottom when expired or off-screen
        if (p.life > p.maxLife || p.y < -10) {
          p.x = Math.random() * w;
          p.y = h * 0.6 + Math.random() * h * 0.35;
          p.life = 0;
          p.alpha = 0.1 + Math.random() * 0.5;
        }

        // Mouse repulsion — particles drift away from cursor
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

        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife;
        const fadeAlpha = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1;
        const finalAlpha = p.alpha * fadeAlpha;

        // Subtle drift wobble
        p.x += Math.sin(t * 0.001 + p.life * 0.02) * 0.15;

        const color = p.warm ? `rgba(201, 168, 76, ${finalAlpha})` : `rgba(160, 190, 255, ${finalAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Glow
        if (p.size > 1.2 && finalAlpha > 0.15) {
          const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
          pg.addColorStop(0, p.warm ? `rgba(201, 168, 76, ${finalAlpha * 0.15})` : `rgba(160, 190, 255, ${finalAlpha * 0.08})`);
          pg.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── MOUSE SPOTLIGHT (subtle radial glow following cursor) ──
    if (!reduced) {
      const spotX = smoothMouse.current.x * w;
      const spotY = smoothMouse.current.y * h;
      const spotR = w * 0.18;
      const spot = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR);
      spot.addColorStop(0, "rgba(201, 168, 76, 0.035)");
      spot.addColorStop(0.4, "rgba(201, 168, 76, 0.015)");
      spot.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = spot;
      ctx.fillRect(spotX - spotR, spotY - spotR, spotR * 2, spotR * 2);
    }

    // ── SCAN LINE (subtle HUD effect) ──
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
  }, [offset, reduced]);

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
