"use client";

import { useEffect, useState, type JSX } from "react";
import dynamic from "next/dynamic";

// Lazy load tsParticles to avoid SSR issues and reduce initial bundle
const Particles = dynamic(
  () => import("@tsparticles/react").then((mod) => mod.default),
  { ssr: false }
);

// tsParticles v3 configuration — using plain object to avoid type gymnastics
// with the deeply nested RecursivePartial types
const PARTICLE_CONFIG = {
  fullScreen: false,
  fpsLimit: 30,
  particles: {
    number: {
      value: 40,
      density: {
        enable: true,
        width: 1920,
        height: 1080,
      },
    },
    color: {
      value: ["#F0EDE6", "#C9A84C", "#FFFFFF"],
    },
    opacity: {
      value: { min: 0.1, max: 0.35 },
    },
    size: {
      value: { min: 0.5, max: 2 },
    },
    move: {
      enable: true,
      speed: { min: 0.1, max: 0.4 },
      direction: "none" as const,
      random: true,
      straight: false,
      outModes: {
        default: "out" as const,
      },
    },
    shape: {
      type: "circle",
    },
  },
  detectRetina: true,
};

/**
 * DustMotes — subtle floating particles that add atmospheric depth.
 *
 * Uses tsParticles with a very low particle count (~40) and slow movement
 * for a premium, cinematic feel. The particles are tiny, semi-transparent
 * dots that drift slowly across the viewport like dust illuminated by light.
 *
 * Loaded dynamically to avoid SSR issues and reduce initial bundle.
 */
export function DustMotes(): JSX.Element {
  const [ready, setReady] = useState(false);

  // Initialize the slim engine once on mount
  useEffect(() => {
    let cancelled = false;
    async function initEngine() {
      try {
        const { initParticlesEngine } = await import("@tsparticles/react");
        const { loadSlim } = await import("@tsparticles/slim");
        await initParticlesEngine(async (engine) => {
          await loadSlim(engine);
        });
        if (!cancelled) setReady(true);
      } catch {
        // tsParticles failed to load — degrade gracefully, no particles
      }
    }
    initEngine();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <></>;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style={{ zIndex: 1 }}
    >
      <Particles
        id="dust-motes"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options={PARTICLE_CONFIG as any}
        className="absolute inset-0"
      />
    </div>
  );
}
