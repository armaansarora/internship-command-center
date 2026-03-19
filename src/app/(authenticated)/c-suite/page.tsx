import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The C-Suite" };

/** Floor 1 — Agent Hub (Phase 5) */
export default async function CSuitePage() {
  await requireUser();

  return (
    <FloorShell floorId="1">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Executive gold radial glow */}
        <div
          className="pointer-events-none absolute"
          aria-hidden="true"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "700px",
            background:
              "radial-gradient(ellipse at center, rgba(201, 168, 76, 0.05) 0%, rgba(201, 168, 76, 0.02) 40%, transparent 70%)",
          }}
        />

        {/* Herringbone parquet-floor hint — executive suite flooring */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                rgba(201, 168, 76, 0.018) 0px,
                rgba(201, 168, 76, 0.018) 1px,
                transparent 1px,
                transparent 24px
              ),
              repeating-linear-gradient(
                -45deg,
                rgba(201, 168, 76, 0.018) 0px,
                rgba(201, 168, 76, 0.018) 1px,
                transparent 1px,
                transparent 24px
              )
            `,
          }}
        />

        {/* Main card */}
        <div
          className="relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(201, 168, 76, 0.25)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.55), 0 0 80px rgba(201, 168, 76, 0.06), inset 0 1px 0 rgba(201,168,76,0.08)",
          }}
        >
          {/* Gold top accent bar */}
          <div
            className="absolute top-0 left-8 right-8 h-px rounded-full"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(201,168,76,0.6) 30%, rgba(201,168,76,0.6) 70%, transparent)",
            }}
            aria-hidden="true"
          />

          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(201, 168, 76, 0.7)", animationDuration: "2s" }}
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
              Floor 1
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
            The C-Suite
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
            The CEO&apos;s office. Full agent orchestration and daily briefings. Where strategy becomes action.
          </p>

          {/* COMING SOON badge */}
          <div className="mb-8">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--gold)",
                textShadow: "0 0 12px rgba(201, 168, 76, 0.5)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Agent network visualization — CSS node graph */}
          <div
            className="relative mb-4 rounded-lg overflow-hidden"
            aria-hidden="true"
            style={{
              height: "72px",
              background: "rgba(201, 168, 76, 0.03)",
              border: "1px solid rgba(201, 168, 76, 0.1)",
            }}
          >
            {/* Central node */}
            <div
              className="absolute rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "12px",
                height: "12px",
                background: "rgba(201, 168, 76, 0.4)",
                border: "1px solid rgba(201, 168, 76, 0.6)",
                boxShadow: "0 0 8px rgba(201, 168, 76, 0.3)",
              }}
            />
            {/* Satellite nodes */}
            {[
              { top: "20%", left: "15%" },
              { top: "70%", left: "20%" },
              { top: "15%", left: "40%" },
              { top: "75%", left: "60%" },
              { top: "20%", left: "80%" },
              { top: "65%", left: "82%" },
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  ...pos,
                  width: "6px",
                  height: "6px",
                  background: "rgba(201, 168, 76, 0.2)",
                  border: "1px solid rgba(201, 168, 76, 0.3)",
                }}
              />
            ))}
            {/* Connection lines — simplified SVG would be ideal, using CSS-only approach */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 400 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {[
                [200, 36, 60, 14],
                [200, 36, 80, 50],
                [200, 36, 160, 11],
                [200, 36, 240, 54],
                [200, 36, 320, 14],
                [200, 36, 328, 47],
              ].map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(201,168,76,0.15)"
                  strokeWidth="0.75"
                  strokeDasharray="3 3"
                />
              ))}
            </svg>
          </div>

          {/* Phase indicator */}
          <div className="mt-2 pt-4" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Phase 5 — The Final Floor
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
