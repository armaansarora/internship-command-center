import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The Situation Room" };

/** Floor 4 — Follow-ups / Calendar (Phase 2) */
export default async function SituationRoomPage() {
  await requireUser();

  const deadlines = [
    { label: "Overdue",   accent: "rgba(220, 60, 60, 0.08)",   border: "rgba(220, 60, 60, 0.15)"  },
    { label: "Due Today", accent: "rgba(220, 120, 40, 0.08)",  border: "rgba(220, 120, 40, 0.15)" },
    { label: "Upcoming",  accent: "rgba(201, 168, 76, 0.06)",  border: "rgba(201, 168, 76, 0.12)" },
  ] as const;

  return (
    <FloorStub
      floorId="4"
      floorLabel="Floor 4"
      floorName="The Situation Room"
      description="Calendar integration, follow-ups, and deadline management. Nothing falls through the cracks."
      phase="Phase 2 — Queued"
      accentColor="rgba(220, 120, 60, 0.9)"
      accentRgb="220, 100, 40"
      cardBorderColor="rgba(220, 100, 40, 0.18)"
      pingDuration="0.9s"
      atmosphereRenderer={
        <>
          {/* Alert pulse rings — urgency feel */}
          <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "600px", height: "600px",
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
          {/* Radar sweep */}
          <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "260px", height: "260px",
              opacity: 0.12,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: "1px solid rgba(220, 120, 40, 0.6)" }}
            />
            <div
              className="absolute rounded-full"
              style={{ inset: "40px", border: "1px solid rgba(220, 120, 40, 0.4)" }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "6px", height: "6px",
                background: "rgba(220, 120, 40, 0.8)",
              }}
            />
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ animation: "radar-sweep 3s linear infinite" }}
            >
              <div
                className="absolute"
                style={{
                  top: "50%", left: "50%",
                  width: "50%", height: "2px",
                  transformOrigin: "0% 50%",
                  background: "linear-gradient(to right, rgba(220, 120, 40, 0.9), rgba(220, 120, 40, 0))",
                }}
              />
              <div
                className="absolute"
                style={{
                  top: 0, left: "50%",
                  width: "50%", height: "100%",
                  transformOrigin: "0% 50%",
                  background:
                    "conic-gradient(from -30deg at 0% 50%, rgba(220, 120, 40, 0.15), rgba(220, 120, 40, 0) 30deg)",
                }}
              />
            </div>
          </div>
        </>
      }
      previewSlot={
        <div className="grid grid-cols-3 gap-3 mb-2">
          {deadlines.map(({ label, accent, border }) => (
            <div
              key={label}
              className="rounded-lg p-3 text-center"
              style={{ background: accent, border: `1px solid ${border}` }}
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
      }
    />
  );
}
