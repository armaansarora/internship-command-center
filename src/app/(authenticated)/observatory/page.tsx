import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The Observatory" };

/** Floor 2 — Analytics (Phase 5) */
export default async function ObservatoryPage() {
  await requireUser();

  // Orbiting dots config: [orbit-radius-px, animation-duration-s, delay-s, size-px, color]
  const orbitDots: { r: number; dur: number; delay: number; size: number; color: string }[] = [
    { r: 48, dur: 6,    delay: 0,    size: 4, color: "rgba(60, 140, 220, 0.7)"  },
    { r: 48, dur: 6,    delay: -3,   size: 3, color: "rgba(60, 140, 220, 0.4)"  },
    { r: 72, dur: 10,   delay: 0,    size: 5, color: "rgba(100, 180, 255, 0.6)" },
    { r: 72, dur: 10,   delay: -5,   size: 3, color: "rgba(60, 140, 220, 0.35)" },
    { r: 96, dur: 15,   delay: 0,    size: 4, color: "rgba(60, 140, 220, 0.5)"  },
    { r: 96, dur: 15,   delay: -7.5, size: 3, color: "rgba(80, 160, 240, 0.3)"  },
  ];

  const chartHeights = [0.3, 0.55, 0.4, 0.8, 0.6, 0.45, 0.7, 0.5, 0.9, 0.65];

  return (
    <FloorStub
      floorId="2"
      floorLabel="Floor 2"
      floorName="The Observatory"
      description="Application analytics, conversion rates, and pipeline velocity. See the full picture."
      phase="Phase 5 — Future"
      accentColor="rgba(60, 160, 240, 0.8)"
      accentRgb="60, 140, 220"
      cardBorderColor="rgba(60, 140, 220, 0.18)"
      pingDelay="1.2s"
      atmosphereRenderer={
        <>
          {/* Radial sweep — telescope/observatory feel */}
          <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "800px", height: "800px",
            }}
          >
            {/* Concentric range rings */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  inset: `${i * 90}px`,
                  border: `1px solid rgba(60, 140, 220, ${0.06 - i * 0.01})`,
                }}
              />
            ))}
            {/* Crosshair — horizontal */}
            <div
              className="absolute"
              style={{
                top: "50%", left: 0, right: 0,
                height: "1px",
                background:
                  "linear-gradient(to right, transparent 0%, rgba(60, 140, 220, 0.08) 20%, rgba(60, 140, 220, 0.12) 50%, rgba(60, 140, 220, 0.08) 80%, transparent 100%)",
              }}
              aria-hidden="true"
            />
            {/* Crosshair — vertical */}
            <div
              className="absolute"
              style={{
                left: "50%", top: 0, bottom: 0,
                width: "1px",
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(60, 140, 220, 0.08) 20%, rgba(60, 140, 220, 0.12) 50%, rgba(60, 140, 220, 0.08) 80%, transparent 100%)",
              }}
              aria-hidden="true"
            />
          </div>
          {/* Orbiting dots system */}
          <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              top: "50%", left: "50%",
              width: "0px", height: "0px",
              opacity: 0.65,
            }}
          >
            {orbitDots.map((dot, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${dot.size}px`,
                  height: `${dot.size}px`,
                  background: dot.color,
                  boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
                  top: `-${dot.size / 2}px`,
                  left: `-${dot.size / 2}px`,
                  ["--orbit-r" as string]: `${dot.r}px`,
                  animation: `orbit ${dot.dur}s linear ${dot.delay}s infinite`,
                }}
              />
            ))}
            {/* Center point */}
            <div
              className="absolute rounded-full"
              style={{
                width: "6px", height: "6px",
                background: "rgba(60, 140, 220, 0.5)",
                boxShadow: "0 0 8px rgba(60, 140, 220, 0.4)",
                top: "-3px", left: "-3px",
              }}
            />
          </div>
        </>
      }
      previewSlot={
        <>
          <div className="flex items-end gap-2 h-16 mb-2 px-2" aria-hidden="true">
            {chartHeights.map((ht, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${ht * 100}%`,
                  background: `rgba(60, 140, 220, ${0.08 + ht * 0.06})`,
                  border: "1px solid rgba(60, 140, 220, 0.12)",
                }}
              />
            ))}
          </div>
          <div
            className="mb-4"
            style={{ height: "1px", background: "rgba(60, 140, 220, 0.1)" }}
            aria-hidden="true"
          />
        </>
      }
    />
  );
}
