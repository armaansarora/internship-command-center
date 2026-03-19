import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The War Room" };

/** Floor 7 — Applications (Phase 1) */
export default async function WarRoomPage() {
  await requireUser();

  return (
    <FloorShell floorId="7">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Tactical grid background overlay */}
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

        {/* Diagonal crosshair lines — corner to corner */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
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

        {/* Pulsing rotating crosshair SVG — War Room unique animation */}
        <div
          className="pointer-events-none absolute"
          aria-hidden="true"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "180px",
            height: "180px",
            opacity: 0.18,
          }}
        >
          {/* Outer pulse ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid rgba(220, 60, 60, 0.5)",
              animation: "crosshair-pulse-ring 2.2s ease-in-out infinite",
            }}
          />
          {/* Rotating crosshair SVG */}
          <svg
            viewBox="0 0 180 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              animation: "crosshair-rotate 18s linear infinite",
            }}
          >
            {/* Circle */}
            <circle cx="90" cy="90" r="70" stroke="rgba(220,60,60,0.6)" strokeWidth="0.75" />
            {/* Crosshair lines */}
            <line x1="20" y1="90" x2="60" y2="90" stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
            <line x1="120" y1="90" x2="160" y2="90" stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
            <line x1="90" y1="20" x2="90" y2="60" stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
            <line x1="90" y1="120" x2="90" y2="160" stroke="rgba(220,60,60,0.8)" strokeWidth="1" />
            {/* Inner tick marks at 45° */}
            <line x1="43" y1="43" x2="52" y2="52" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
            <line x1="137" y1="43" x2="128" y2="52" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
            <line x1="43" y1="137" x2="52" y2="128" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
            <line x1="137" y1="137" x2="128" y2="128" stroke="rgba(220,60,60,0.5)" strokeWidth="0.75" />
            {/* Center dot */}
            <circle cx="90" cy="90" r="3" fill="rgba(220,60,60,0.7)" />
            {/* Inner circle */}
            <circle cx="90" cy="90" r="12" stroke="rgba(220,60,60,0.4)" strokeWidth="0.75" />
          </svg>
        </div>

        {/* Main card — fades up on mount */}
        <div
          className="floor-card-enter relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(220, 60, 60, 0.15)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            {/* Pulse dot */}
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(220, 60, 60, 0.6)" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "rgb(220, 60, 60)" }}
              />
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "var(--gold)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Floor 7
            </span>
          </div>

          {/* Floor name */}
          <h1
            className="mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.4rem, 3vw, 1.875rem)",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            The War Room
          </h1>

          {/* Description */}
          <p
            className="mb-6"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Application pipeline. Track, manage, and dominate your job search.
          </p>

          {/* COMING SOON badge — glow pulse */}
          <div className="mb-8">
            <span
              className="coming-soon-glow"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(220, 80, 80, 0.9)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Faded stat placeholder boxes */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Applications", hint: "00" },
              { label: "Interviews", hint: "00" },
              { label: "Offers", hint: "00" },
            ].map(({ label, hint }) => (
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
                  {hint}
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

          {/* Phase indicator */}
          <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Phase 1 — Development Queued
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
