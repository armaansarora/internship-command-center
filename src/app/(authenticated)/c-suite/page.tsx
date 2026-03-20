import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The C-Suite" };

/** Floor 1 — Agent Hub (Phase 5) */
export default async function CSuitePage() {
  await requireUser();

  const satelliteNodes = [
    { top: "20%", left: "15%" },
    { top: "70%", left: "20%" },
    { top: "15%", left: "40%" },
    { top: "75%", left: "60%" },
    { top: "20%", left: "80%" },
    { top: "65%", left: "82%" },
  ] as const;

  const connectionLines: [number, number, number, number][] = [
    [200, 36, 60,  14],
    [200, 36, 80,  50],
    [200, 36, 160, 11],
    [200, 36, 240, 54],
    [200, 36, 320, 14],
    [200, 36, 328, 47],
  ];

  return (
    <FloorStub
      floorId="1"
      floorLabel="Floor 1"
      floorName="The C-Suite"
      description={<>The CEO&apos;s office. Full agent orchestration and daily briefings. Where strategy becomes action.</>}
      phase="Phase 5 — The Final Floor"
      accentColor="var(--gold)"
      accentRgb="201, 168, 76"
      cardBorderColor="rgba(201, 168, 76, 0.25)"
      pingDuration="2s"
      atmosphereRenderer={
        <>
          {/* Executive gold radial glow */}
          <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "700px", height: "700px",
              background:
                "radial-gradient(ellipse at center, rgba(201, 168, 76, 0.05) 0%, rgba(201, 168, 76, 0.02) 40%, transparent 70%)",
            }}
          />
          {/* Herringbone parquet-floor hint */}
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
        </>
      }
      previewSlot={
        <>
          {/* Gold top accent bar — inside card, absolutely positioned */}
          <div
            className="absolute top-0 left-8 right-8 h-px rounded-full"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(201,168,76,0.6) 30%, rgba(201,168,76,0.6) 70%, transparent)",
            }}
            aria-hidden="true"
          />

          {/* Animated signature stroke */}
          <div
            className="mb-4 rounded-lg overflow-hidden"
            aria-hidden="true"
            style={{
              height: "56px",
              background: "rgba(201, 168, 76, 0.03)",
              border: "1px solid rgba(201, 168, 76, 0.1)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 320 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            >
              <path
                d="M 20 34 C 35 18, 55 38, 70 24 C 85 10, 100 40, 118 28 C 132 18, 145 36, 160 22 C 175 8, 192 38, 210 26 C 224 16, 238 34, 252 22 C 265 12, 278 32, 295 24"
                stroke="rgba(201,168,76,0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="300"
                strokeDashoffset="300"
                style={{ animation: "stroke-draw 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards" }}
              />
              <path
                d="M 18 38 C 80 42, 200 42, 298 38"
                stroke="rgba(201,168,76,0.25)"
                strokeWidth="0.75"
                strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset="300"
                style={{ animation: "stroke-draw 1.8s cubic-bezier(0.4, 0, 0.2, 1) 1.8s forwards" }}
              />
            </svg>
          </div>

          {/* Agent network visualization */}
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
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "12px", height: "12px",
                background: "rgba(201, 168, 76, 0.4)",
                border: "1px solid rgba(201, 168, 76, 0.6)",
                boxShadow: "0 0 8px rgba(201, 168, 76, 0.3)",
              }}
            />
            {/* Satellite nodes */}
            {satelliteNodes.map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  ...pos,
                  width: "6px", height: "6px",
                  background: "rgba(201, 168, 76, 0.2)",
                  border: "1px solid rgba(201, 168, 76, 0.3)",
                }}
              />
            ))}
            {/* Connection lines */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 400 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {connectionLines.map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(201,168,76,0.15)"
                  strokeWidth="0.75"
                  strokeDasharray="3 3"
                />
              ))}
            </svg>
          </div>
        </>
      }
    />
  );
}
