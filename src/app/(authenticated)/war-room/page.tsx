import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The War Room" };

/** Floor 7 — Applications (Phase 1) */
export default async function WarRoomPage() {
  await requireUser();

  return (
    <FloorStub
      floorId="7"
      floorLabel="Floor 7"
      floorName="The War Room"
      description="Application pipeline. Track, manage, and dominate your job search."
      phase="Phase 1 — Development Queued"
      accentColor="rgba(220, 80, 80, 0.9)"
      accentRgb="220, 60, 60"
      cardBorderColor="rgba(220, 60, 60, 0.15)"
      atmosphereRenderer={
        <>
          {/* Tactical grid */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage: `
                linear-gradient(rgba(220, 60, 60, 0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(220, 60, 60, 0.04) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
              opacity: 0.7,
            }}
          />
          {/* Diagonal crosshair lines */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, transparent 49.5%, rgba(220,60,60,0.03) 49.5%, rgba(220,60,60,0.03) 50.5%, transparent 50.5%),
                  linear-gradient(-45deg, transparent 49.5%, rgba(220,60,60,0.03) 49.5%, rgba(220,60,60,0.03) 50.5%, transparent 50.5%)
                `,
              }}
            />
          </div>
          {/* Pulsing rotating crosshair */}
          <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "180px", height: "180px",
              opacity: 0.18,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid rgba(220, 60, 60, 0.5)",
                animation: "crosshair-pulse-ring 2.2s ease-in-out infinite",
              }}
            />
            <svg
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                animation: "crosshair-rotate 18s linear infinite",
              }}
            >
              <circle cx="90" cy="90" r="70" stroke="rgba(220,60,60,0.6)" strokeWidth="0.75" />
              <line x1="20" y1="90" x2="60"  y2="90"  stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
              <line x1="120" y1="90" x2="160" y2="90" stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
              <line x1="90" y1="20" x2="90"  y2="60"  stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
              <line x1="90" y1="120" x2="90" y2="160" stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
              <line x1="43" y1="43"  x2="52" y2="52"  stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
              <line x1="137" y1="43" x2="128" y2="52" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
              <line x1="43" y1="137" x2="52" y2="128" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
              <line x1="137" y1="137" x2="128" y2="128" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
              <circle cx="90" cy="90" r="3"  fill="rgba(220,60,60,0.7)" />
              <circle cx="90" cy="90" r="12" stroke="rgba(220,60,60,0.4)" strokeWidth="0.75" />
            </svg>
          </div>
        </>
      }
      previewSlot={
        <div className="grid grid-cols-3 gap-3">
          {(["Applications", "Interviews", "Offers"] as const).map((label) => (
            <div
              key={label}
              className="rounded-lg p-3 text-center"
              style={{
                background: "rgba(220, 60, 60, 0.04)",
                border: "1px solid rgba(220, 60, 60, 0.1)",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "1.25rem",
                  color: "rgba(220, 80, 80, 0.25)",
                  marginBottom: "4px",
                }}
              >
                00
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}
