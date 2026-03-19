import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Briefing Room" };

/** Floor 3 — Interview Prep (Phase 4) */
export default async function BriefingRoomPage() {
  await requireUser();

  return (
    <FloorShell floorId="3">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Clinical grid — blueprint/technical feel */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: `
              linear-gradient(rgba(80, 160, 220, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(80, 160, 220, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />

        {/* Blueprint axis lines */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: `
              linear-gradient(rgba(80, 160, 220, 0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(80, 160, 220, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: "320px 320px",
          }}
        />

        {/* Main card */}
        <div
          className="relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(80, 160, 220, 0.18)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(80, 160, 220, 0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(80, 160, 220, 0.6)", animationDelay: "0.9s" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "rgb(80, 160, 220)" }}
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
              Floor 3
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
            The Briefing Room
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
            Interview preparation packets with company-specific research. Walk in knowing everything.
          </p>

          {/* COMING SOON badge */}
          <div className="mb-8">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(80, 180, 240, 0.8)",
                textShadow: "0 0 10px rgba(80, 160, 220, 0.3)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Briefing document stubs */}
          <div className="flex flex-col gap-2 mb-4" aria-hidden="true">
            {[
              { label: "Company Overview", width: "100%" },
              { label: "Likely Interview Questions", width: "80%" },
              { label: "Talking Points", width: "60%" },
            ].map(({ label, width }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{
                  background: "rgba(80, 160, 220, 0.04)",
                  border: "1px solid rgba(80, 160, 220, 0.1)",
                }}
              >
                {/* Document icon */}
                <div
                  style={{
                    width: "12px",
                    height: "14px",
                    borderRadius: "2px",
                    background: "rgba(80, 160, 220, 0.15)",
                    border: "1px solid rgba(80, 160, 220, 0.2)",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    height: "2px",
                    width: width,
                    background: "rgba(80, 160, 220, 0.12)",
                    borderRadius: "2px",
                  }}
                />
                <span
                  className="sr-only"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    marginLeft: "auto",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Phase indicator */}
          <div className="mt-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Phase 4 — Planned
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
