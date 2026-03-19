import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Situation Room" };

/** Floor 4 — Follow-ups / Calendar (Phase 2) */
export default async function SituationRoomPage() {
  await requireUser();

  return (
    <FloorShell floorId="4">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Alert pulse rings — urgency feel */}
        <div
          className="pointer-events-none absolute"
          aria-hidden="true"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                inset: `${i * 80}px`,
                border: `1px solid rgba(220, 120, 40, ${0.05 - i * 0.01})`,
                animation: `ping ${1.5 + i * 0.4}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* Subtle horizontal scan line — SCIF feel */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(220, 100, 40, 0.015) 3px, rgba(220, 100, 40, 0.015) 4px)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* Radar sweep animation — centered, behind card */}
        <div
          className="pointer-events-none absolute"
          aria-hidden="true"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "260px",
            height: "260px",
            opacity: 0.12,
          }}
        >
          {/* Static radar circle */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid rgba(220, 120, 40, 0.6)",
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute rounded-full"
            style={{
              inset: "40px",
              border: "1px solid rgba(220, 120, 40, 0.4)",
            }}
          />
          {/* Center dot */}
          <div
            className="absolute rounded-full"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "6px",
              height: "6px",
              background: "rgba(220, 120, 40, 0.8)",
            }}
          />
          {/* Rotating sweep line */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              animation: "radar-sweep 3s linear infinite",
            }}
          >
            {/* Sweep sector — gradient from center */}
            <div
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                width: "50%",
                height: "2px",
                transformOrigin: "0% 50%",
                background:
                  "linear-gradient(to right, rgba(220, 120, 40, 0.9), rgba(220, 120, 40, 0))",
              }}
            />
            {/* Sweep afterglow (fan) */}
            <div
              className="absolute"
              style={{
                top: 0,
                left: "50%",
                width: "50%",
                height: "100%",
                transformOrigin: "0% 50%",
                background:
                  "conic-gradient(from -30deg at 0% 50%, rgba(220, 120, 40, 0.15), rgba(220, 120, 40, 0) 30deg)",
              }}
            />
          </div>
        </div>

        {/* Main card — fades up on mount */}
        <div
          className="floor-card-enter relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(220, 100, 40, 0.18)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(220, 100, 40, 0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(220, 100, 40, 0.8)", animationDuration: "0.9s" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "rgb(220, 100, 40)" }}
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
              Floor 4
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
            The Situation Room
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
            Calendar integration, follow-ups, and deadline management. Nothing falls through the cracks.
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
                color: "rgba(220, 120, 60, 0.9)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Deadline countdown boxes */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: "Overdue", accent: "rgba(220, 60, 60, 0.08)" },
              { label: "Due Today", accent: "rgba(220, 120, 40, 0.08)" },
              { label: "Upcoming", accent: "rgba(201, 168, 76, 0.06)" },
            ].map(({ label, accent }) => (
              <div
                key={label}
                className="rounded-lg p-3 text-center"
                style={{
                  background: accent,
                  border: `1px solid ${accent.replace("0.08", "0.15").replace("0.06", "0.12")}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "1.1rem",
                    color: "rgba(220, 120, 60, 0.2)",
                    marginBottom: "4px",
                  }}
                >
                  —
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
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Phase 2 — Queued
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
