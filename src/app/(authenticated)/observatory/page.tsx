import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Observatory" };

/** Floor 2 — Analytics (Phase 5) */
export default async function ObservatoryPage() {
  await requireUser();

  return (
    <FloorShell floorId="2">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Radial sweep — telescope/observatory feel */}
        <div
          className="pointer-events-none absolute"
          aria-hidden="true"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "800px",
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
          {/* Crosshair lines */}
          <div
            className="absolute"
            style={{
              top: "50%",
              left: 0,
              right: 0,
              height: "1px",
              background:
                "linear-gradient(to right, transparent 0%, rgba(60, 140, 220, 0.08) 20%, rgba(60, 140, 220, 0.12) 50%, rgba(60, 140, 220, 0.08) 80%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute"
            style={{
              left: "50%",
              top: 0,
              bottom: 0,
              width: "1px",
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(60, 140, 220, 0.08) 20%, rgba(60, 140, 220, 0.12) 50%, rgba(60, 140, 220, 0.08) 80%, transparent 100%)",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Main card */}
        <div
          className="relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(60, 140, 220, 0.18)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(60, 140, 220, 0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(60, 140, 220, 0.6)", animationDelay: "1.2s" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "rgb(60, 140, 220)" }}
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
              Floor 2
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
            The Observatory
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
            Application analytics, conversion rates, and pipeline velocity. See the full picture.
          </p>

          {/* COMING SOON badge */}
          <div className="mb-8">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(60, 160, 240, 0.8)",
                textShadow: "0 0 10px rgba(60, 140, 220, 0.3)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Faded chart bars — analytics preview */}
          <div
            className="flex items-end gap-2 h-16 mb-2 px-2"
            aria-hidden="true"
          >
            {[0.3, 0.55, 0.4, 0.8, 0.6, 0.45, 0.7, 0.5, 0.9, 0.65].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h * 100}%`,
                  background: `rgba(60, 140, 220, ${0.08 + h * 0.06})`,
                  border: "1px solid rgba(60, 140, 220, 0.12)",
                }}
              />
            ))}
          </div>

          {/* Baseline */}
          <div
            className="mb-4"
            style={{
              height: "1px",
              background: "rgba(60, 140, 220, 0.1)",
            }}
            aria-hidden="true"
          />

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
              Phase 5 — Future
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
