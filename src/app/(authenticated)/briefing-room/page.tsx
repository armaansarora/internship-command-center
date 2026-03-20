import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The Briefing Room" };

/** Floor 3 — Interview Prep (Phase 4) */
export default async function BriefingRoomPage() {
  await requireUser();

  // Teletype lines — duplicated so the scroll loop is seamless
  const teletypeLines = [
    "INTEL: COMPANY OVERVIEW — LOADING...",
    "SRC: SEC-10K-FILING — PARSED",
    "BRIEF: INTERVIEW Q&A — COMPILING",
    "STATUS: TALKING POINTS — PENDING",
    "TARGET: ROLE ALIGNMENT — ANALYZING",
    "SIGNAL: CULTURAL FIT SCORE — TBD",
    "REF: GLASSDOOR DATA — INDEXED",
    "EXEC: LINKEDIN RESEARCH — READY",
  ];

  const briefingDocs = [
    { label: "Company Overview",          width: "100%" },
    { label: "Likely Interview Questions", width: "80%"  },
    { label: "Talking Points",             width: "60%"  },
  ] as const;

  return (
    <FloorStub
      floorId="3"
      floorLabel="Floor 3"
      floorName="The Briefing Room"
      description="Interview preparation packets with company-specific research. Walk in knowing everything."
      phase="Phase 4 — Planned"
      accentColor="rgba(80, 180, 240, 0.8)"
      accentRgb="80, 160, 220"
      cardBorderColor="rgba(80, 160, 220, 0.18)"
      pingDelay="0.9s"
      atmosphereRenderer={
        <>
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
          {/* Scrolling teletype — right side */}
          <div
            className="pointer-events-none absolute right-8 top-0 bottom-0 overflow-hidden"
            aria-hidden="true"
            style={{ width: "220px", opacity: 0.09 }}
          >
            <div style={{ animation: "teletype-scroll 12s linear infinite" }}>
              {[...teletypeLines, ...teletypeLines].map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    color: "rgba(80, 160, 220, 1)",
                    padding: "3px 0",
                    borderBottom: "1px solid rgba(80, 160, 220, 0.15)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
          {/* Scrolling teletype — left side */}
          <div
            className="pointer-events-none absolute left-8 top-0 bottom-0 overflow-hidden"
            aria-hidden="true"
            style={{ width: "180px", opacity: 0.06 }}
          >
            <div
              style={{
                animation: "teletype-scroll 16s linear infinite",
                animationDelay: "-6s",
              }}
            >
              {[...teletypeLines, ...teletypeLines].map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    color: "rgba(80, 160, 220, 1)",
                    padding: "3px 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </>
      }
      previewSlot={
        <div className="flex flex-col gap-2 mb-4" aria-hidden="true">
          {briefingDocs.map(({ label, width }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{
                background: "rgba(80, 160, 220, 0.04)",
                border: "1px solid rgba(80, 160, 220, 0.1)",
              }}
            >
              <div
                style={{
                  width: "12px", height: "14px",
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
      }
    />
  );
}
