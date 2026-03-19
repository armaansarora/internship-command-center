import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Writing Room" };

/** Floor 5 — Cover Letters (Phase 4) */
export default async function WritingRoomPage() {
  await requireUser();

  return (
    <FloorShell floorId="5">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Ruled-line texture — literary feel */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(201, 168, 76, 0.04) 31px, rgba(201, 168, 76, 0.04) 32px)",
            backgroundSize: "100% 32px",
          }}
        />

        {/* Left margin rule — classic notebook detail */}
        <div
          className="pointer-events-none absolute inset-y-0"
          aria-hidden="true"
          style={{
            left: "8%",
            width: "1px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(180, 60, 60, 0.08) 15%, rgba(180, 60, 60, 0.06) 85%, transparent 100%)",
          }}
        />

        {/* Main card — fades up on mount */}
        <div
          className="floor-card-enter relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(201, 168, 76, 0.12)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(201, 168, 76, 0.5)", animationDelay: "0.6s" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "var(--gold)" }}
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
              Floor 5
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
            The Writing Room
          </h1>

          {/* Description — with blinking cursor inline at end */}
          <p
            className="mb-6"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            AI-powered cover letters tailored to every application. Every word, earned.{" "}
            <span
              className="cursor-blink inline-block align-middle"
              aria-hidden="true"
              style={{
                width: "2px",
                height: "14px",
                background: "rgba(201, 168, 76, 0.7)",
                verticalAlign: "middle",
                marginBottom: "1px",
              }}
            />
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
                color: "rgba(201, 168, 76, 0.7)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Open notebook preview — ruled lines with animated cursor at end */}
          <div
            className="rounded-lg p-4 mb-4 overflow-hidden"
            aria-hidden="true"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              position: "relative",
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  height: "1px",
                  background: "rgba(201, 168, 76, 0.06)",
                  marginBottom: "16px",
                  width: i === 2 ? "65%" : i === 5 ? "40%" : "100%",
                }}
              />
            ))}
            {/* Blinking cursor on the last line */}
            <div
              className="cursor-blink"
              style={{
                width: "2px",
                height: "14px",
                background: "rgba(201, 168, 76, 0.55)",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
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
