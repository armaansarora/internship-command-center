"use client";

import type { JSX } from "react";
import { useState, useCallback, useTransition } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type QuestionCategory = "behavioral" | "technical" | "culture-fit" | "case";

export interface PrepQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  difficulty?: "low" | "medium" | "high";
  sampleAnswer?: string;
}

export interface TalkingPoint {
  id: string;
  title: string;
  detail: string;
}

export interface InterviewerIntel {
  name: string;
  title: string;
  linkedInUrl?: string;
  background?: string;
  knownFocus?: string[];
}

export interface PrepPacket {
  id: string;
  company: string;
  role: string;
  interviewDate: string;
  round: string;
  createdAt: string;
  updatedAt: string;

  // Company overview
  companyOverview: {
    industry: string;
    headquarters?: string;
    aum?: string;
    founded?: string;
    keyBusinessLines: string[];
    recentNews?: string[];
    culture?: string;
  };

  // Questions
  questions: PrepQuestion[];

  // Talking points
  talkingPoints: TalkingPoint[];

  // Interviewer intel (optional)
  interviewers?: InterviewerIntel[];

  // Completeness
  completeness: number;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------
const CATEGORY_META: Record<
  QuestionCategory,
  { label: string; color: string; bgColor: string }
> = {
  behavioral: {
    label: "BEHAVIORAL",
    color: "#4A9EDB",
    bgColor: "rgba(74, 158, 219, 0.08)",
  },
  technical: {
    label: "TECHNICAL",
    color: "#7EC8E3",
    bgColor: "rgba(126, 200, 227, 0.08)",
  },
  "culture-fit": {
    label: "CULTURE FIT",
    color: "#00CC88",
    bgColor: "rgba(0, 204, 136, 0.07)",
  },
  case: {
    label: "CASE",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.07)",
  },
};

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------
function SectionDivider({ label }: { label: string }): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        margin: "18px 0 10px",
      }}
    >
      <span
        style={{
          fontSize: "8px",
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          color: "#4A9EDB",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          height: "1px",
          background:
            "linear-gradient(to right, rgba(74, 158, 219, 0.4), transparent)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company overview section
// ---------------------------------------------------------------------------
function CompanyOverviewSection({
  packet,
}: {
  packet: PrepPacket;
}): JSX.Element {
  const { companyOverview } = packet;

  return (
    <section aria-label="Company overview">
      <SectionDivider label="COMPANY OVERVIEW" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 16px",
          marginBottom: "12px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "8px",
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              color: "#4A6A85",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "2px",
            }}
          >
            INDUSTRY
          </span>
          <span
            style={{
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              color: "#E8F4FD",
            }}
          >
            {companyOverview.industry}
          </span>
        </div>

        {companyOverview.aum && (
          <div>
            <span
              style={{
                fontSize: "8px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#4A6A85",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "block",
                marginBottom: "2px",
              }}
            >
              AUM
            </span>
            <span
              style={{
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#7EC8E3",
                fontWeight: 700,
              }}
            >
              {companyOverview.aum}
            </span>
          </div>
        )}

        {companyOverview.headquarters && (
          <div>
            <span
              style={{
                fontSize: "8px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#4A6A85",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "block",
                marginBottom: "2px",
              }}
            >
              HQ
            </span>
            <span
              style={{
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#E8F4FD",
              }}
            >
              {companyOverview.headquarters}
            </span>
          </div>
        )}

        {companyOverview.founded && (
          <div>
            <span
              style={{
                fontSize: "8px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#4A6A85",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "block",
                marginBottom: "2px",
              }}
            >
              FOUNDED
            </span>
            <span
              style={{
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#E8F4FD",
              }}
            >
              {companyOverview.founded}
            </span>
          </div>
        )}
      </div>

      {/* Key business lines */}
      {companyOverview.keyBusinessLines.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <span
            style={{
              fontSize: "8px",
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              color: "#4A6A85",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "5px",
            }}
          >
            KEY BUSINESS LINES
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {companyOverview.keyBusinessLines.map((line, i) => (
              <span
                key={i}
                style={{
                  fontSize: "10px",
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                  color: "#4A9EDB",
                  backgroundColor: "rgba(74, 158, 219, 0.08)",
                  border: "1px solid rgba(74, 158, 219, 0.2)",
                  borderRadius: "2px",
                  padding: "2px 7px",
                }}
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent news */}
      {companyOverview.recentNews && companyOverview.recentNews.length > 0 && (
        <div>
          <span
            style={{
              fontSize: "8px",
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              color: "#4A6A85",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "5px",
            }}
          >
            RECENT INTEL
          </span>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {companyOverview.recentNews.map((news, i) => (
              <li
                key={i}
                style={{
                  fontSize: "11px",
                  fontFamily: "'Satoshi', 'Inter', sans-serif",
                  color: "#8BAECB",
                  paddingLeft: "10px",
                  borderLeft: "2px solid rgba(74, 158, 219, 0.3)",
                  lineHeight: 1.5,
                }}
              >
                {news}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Single question card
// ---------------------------------------------------------------------------
function QuestionCard({ question }: { question: PrepQuestion }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[question.category];

  return (
    <article
      aria-label={`${meta.label} question: ${question.text}`}
      style={{
        backgroundColor: meta.bgColor,
        border: `1px solid ${meta.color}22`,
        borderRadius: "2px",
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "7px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: meta.color,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {meta.label}
            </span>
            {question.difficulty && (
              <span
                style={{
                  fontSize: "7px",
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                  color:
                    question.difficulty === "high"
                      ? "#DC3C3C"
                      : question.difficulty === "medium"
                      ? "#F59E0B"
                      : "#00CC88",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {question.difficulty.toUpperCase()}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: "12px",
              fontFamily: "'Satoshi', 'Inter', sans-serif",
              color: "#E8F4FD",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {question.text}
          </p>
        </div>

        {question.sampleAnswer && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide sample answer" : "Show sample answer"}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#4A6A85",
              fontSize: "10px",
              flexShrink: 0,
              padding: "2px 4px",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>

      {expanded && question.sampleAnswer && (
        <div
          style={{
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: `1px solid ${meta.color}22`,
          }}
        >
          <span
            style={{
              fontSize: "8px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#4A6A85",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              display: "block",
              marginBottom: "4px",
            }}
          >
            SAMPLE APPROACH
          </span>
          <p
            style={{
              fontSize: "11px",
              fontFamily: "'Satoshi', 'Inter', sans-serif",
              color: "#8BAECB",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {question.sampleAnswer}
          </p>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Questions section
// ---------------------------------------------------------------------------
function QuestionsSection({
  questions,
}: {
  questions: PrepQuestion[];
}): JSX.Element {
  const [activeCategory, setActiveCategory] =
    useState<QuestionCategory | "all">("all");

  const categories: Array<QuestionCategory | "all"> = [
    "all",
    "behavioral",
    "technical",
    "culture-fit",
    "case",
  ];

  const filtered =
    activeCategory === "all"
      ? questions
      : questions.filter((q) => q.category === activeCategory);

  return (
    <section aria-label="Interview questions">
      <SectionDivider label={`LIKELY QUESTIONS (${questions.length})`} />

      {/* Category filter tabs */}
      <div
        role="tablist"
        aria-label="Question categories"
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const count =
            cat === "all"
              ? questions.length
              : questions.filter((q) => q.category === cat).length;
          const meta = cat !== "all" ? CATEGORY_META[cat] : null;

          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontSize: "9px",
                fontFamily: "'JetBrains Mono', monospace",
                color: isActive
                  ? meta?.color ?? "#E8F4FD"
                  : "#4A6A85",
                backgroundColor: isActive
                  ? meta?.bgColor ?? "rgba(74, 158, 219, 0.1)"
                  : "transparent",
                border: isActive
                  ? `1px solid ${meta?.color ?? "#4A9EDB"}44`
                  : "1px solid transparent",
                borderRadius: "2px",
                padding: "3px 8px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                transition: "all 0.15s ease",
              }}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
            >
              {cat === "all" ? "ALL" : CATEGORY_META[cat].label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p
          style={{
            fontSize: "11px",
            fontFamily: "'JetBrains Mono', monospace",
            color: "#4A6A85",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          No questions in this category
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Talking points section
// ---------------------------------------------------------------------------
function TalkingPointsSection({
  points,
}: {
  points: TalkingPoint[];
}): JSX.Element {
  return (
    <section aria-label="Talking points">
      <SectionDivider label={`TALKING POINTS (${points.length})`} />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {points.map((point, i) => (
          <article
            key={point.id}
            aria-label={point.title}
            style={{
              backgroundColor: "rgba(13, 21, 36, 0.6)",
              border: "1px solid rgba(26, 46, 74, 0.8)",
              borderLeft: "3px solid rgba(74, 158, 219, 0.5)",
              borderRadius: "2px",
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: "8px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#4A9EDB",
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#E8F4FD",
                  fontWeight: 600,
                }}
              >
                {point.title}
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                fontFamily: "'Satoshi', 'Inter', sans-serif",
                color: "#8BAECB",
                margin: 0,
                lineHeight: 1.6,
                paddingLeft: "22px",
              }}
            >
              {point.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Interviewer intel section
// ---------------------------------------------------------------------------
function InterviewerIntelSection({
  interviewers,
}: {
  interviewers: InterviewerIntel[];
}): JSX.Element {
  return (
    <section aria-label="Interviewer intelligence">
      <SectionDivider label="INTERVIEWER INTEL" />

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {interviewers.map((person, i) => (
          <article
            key={i}
            aria-label={`${person.name}, ${person.title}`}
            style={{
              backgroundColor: "rgba(13, 21, 36, 0.6)",
              border: "1px solid rgba(74, 158, 219, 0.18)",
              borderRadius: "2px",
              padding: "10px 12px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}
            >
              {/* Avatar placeholder */}
              <div
                aria-hidden="true"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "2px",
                  backgroundColor: "rgba(74, 158, 219, 0.12)",
                  border: "1px solid rgba(74, 158, 219, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#4A9EDB",
                  fontWeight: 700,
                }}
              >
                {person.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#E8F4FD",
                    fontWeight: 700,
                    marginBottom: "2px",
                  }}
                >
                  {person.name}
                  {person.linkedInUrl && (
                    <a
                      href={person.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${person.name} LinkedIn profile`}
                      style={{
                        fontSize: "8px",
                        color: "#4A9EDB",
                        marginLeft: "8px",
                        textDecoration: "none",
                        letterSpacing: "0.06em",
                      }}
                    >
                      [LI↗]
                    </a>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#4A6A85",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  {person.title}
                </div>

                {person.background && (
                  <p
                    style={{
                      fontSize: "11px",
                      fontFamily: "'Satoshi', 'Inter', sans-serif",
                      color: "#8BAECB",
                      margin: "0 0 6px 0",
                      lineHeight: 1.55,
                    }}
                  >
                    {person.background}
                  </p>
                )}

                {person.knownFocus && person.knownFocus.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontSize: "7px",
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "#4A6A85",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      KNOWN FOCUS AREAS
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {person.knownFocus.map((focus, fi) => (
                        <span
                          key={fi}
                          style={{
                            fontSize: "9px",
                            fontFamily: "'JetBrains Mono', monospace",
                            color: "#7EC8E3",
                            backgroundColor: "rgba(126, 200, 227, 0.07)",
                            border: "1px solid rgba(126, 200, 227, 0.18)",
                            borderRadius: "2px",
                            padding: "2px 6px",
                          }}
                        >
                          {focus}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface PrepPacketViewerProps {
  packet: PrepPacket | null;
  onPrint?: (packetId: string) => void;
  onExport?: (packetId: string) => void;
}

export function PrepPacketViewer({
  packet,
  onPrint,
  onExport,
}: PrepPacketViewerProps): JSX.Element {
  // React 19 — wrap export/print fire-and-forget actions in transitions so the
  // buttons can render a pending state without blocking the rest of the UI.
  const [isPrinting, startPrintTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  const handlePrint = useCallback(() => {
    if (!packet) return;
    startPrintTransition(() => {
      onPrint?.(packet.id);
    });
  }, [packet, onPrint]);

  const handleExport = useCallback(() => {
    if (!packet) return;
    startExportTransition(() => {
      onExport?.(packet.id);
    });
  }, [packet, onExport]);

  if (!packet) {
    return (
      <div
        role="status"
        aria-label="No prep packet selected"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "10px",
          padding: "24px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "40px",
            height: "52px",
            border: "1px solid rgba(74, 158, 219, 0.2)",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.4,
          }}
        >
          <div
            style={{
              width: "24px",
              height: "3px",
              backgroundColor: "#4A9EDB",
              marginBottom: "4px",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "#4A6A85",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          SELECT AN INTERVIEW
          <br />
          TO VIEW PREP PACKET
        </span>
      </div>
    );
  }

  const packetDate = new Date(packet.interviewDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      role="region"
      aria-label={`Prep packet for ${packet.company} — ${packet.role}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      }}
    >
      {/* Document header */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: "1px solid rgba(26, 46, 74, 0.8)",
        }}
      >
        {/* Classified stamp banner */}
        <div
          className="classified-header"
          role="banner"
          aria-label="Classified document header"
        >
          ── PREP PACKET // CLASSIFIED ──
        </div>

        {/* Title area */}
        <div
          style={{
            padding: "10px 14px 8px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontSize: "15px",
                fontFamily: "'Playfair Display', 'Georgia', serif",
                color: "#E8F4FD",
                margin: "0 0 2px 0",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {packet.company}
            </h2>
            <div
              style={{
                fontSize: "11px",
                color: "#8BAECB",
                marginBottom: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {packet.role}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "9px", color: "#4A6A85" }}>
                {packet.round.toUpperCase()}
              </span>
              <span style={{ fontSize: "9px", color: "#4A6A85" }}>
                {packetDate}
              </span>
              <span
                style={{
                  fontSize: "8px",
                  color:
                    packet.completeness >= 80
                      ? "#00CC88"
                      : packet.completeness >= 50
                      ? "#F59E0B"
                      : "#DC3C3C",
                  fontWeight: 700,
                }}
              >
                {packet.completeness}% COMPLETE
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {onPrint && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                aria-busy={isPrinting}
                aria-label="Print prep packet"
                style={{
                  fontSize: "8px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#4A6A85",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(26, 46, 74, 0.8)",
                  borderRadius: "2px",
                  padding: "4px 8px",
                  cursor: isPrinting ? "wait" : "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  transition: "all 0.15s ease",
                  opacity: isPrinting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (isPrinting) return;
                  (e.currentTarget as HTMLButtonElement).style.color = "#4A9EDB";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(74, 158, 219, 0.3)";
                }}
                onMouseLeave={(e) => {
                  if (isPrinting) return;
                  (e.currentTarget as HTMLButtonElement).style.color = "#4A6A85";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(26, 46, 74, 0.8)";
                }}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
              >
                {isPrinting ? "PRINTING…" : "PRINT"}
              </button>
            )}
            {onExport && (
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                aria-busy={isExporting}
                aria-label="Export prep packet"
                style={{
                  fontSize: "8px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#4A9EDB",
                  backgroundColor: "rgba(74, 158, 219, 0.08)",
                  border: "1px solid rgba(74, 158, 219, 0.25)",
                  borderRadius: "2px",
                  padding: "4px 8px",
                  cursor: isExporting ? "wait" : "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  transition: "all 0.15s ease",
                  opacity: isExporting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (isExporting) return;
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "rgba(74, 158, 219, 0.14)";
                }}
                onMouseLeave={(e) => {
                  if (isExporting) return;
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "rgba(74, 158, 219, 0.08)";
                }}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
              >
                {isExporting ? "EXPORTING…" : "EXPORT"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 14px 20px",
          scrollbarWidth: "thin",
          scrollbarColor: "#1A2E4A #060A12",
        }}
      >
        {/* Company overview */}
        <CompanyOverviewSection packet={packet} />

        {/* Likely questions */}
        {packet.questions.length > 0 && (
          <QuestionsSection questions={packet.questions} />
        )}

        {/* Talking points */}
        {packet.talkingPoints.length > 0 && (
          <TalkingPointsSection points={packet.talkingPoints} />
        )}

        {/* Interviewer intel */}
        {packet.interviewers && packet.interviewers.length > 0 && (
          <InterviewerIntelSection interviewers={packet.interviewers} />
        )}

        {/* Document footer */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(26, 46, 74, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ fontSize: "8px", color: "#4A6A85", letterSpacing: "0.08em" }}
          >
            PACKET ID: {packet.id.slice(0, 8).toUpperCase()}
          </span>
          <span
            style={{ fontSize: "8px", color: "#4A6A85", letterSpacing: "0.06em" }}
          >
            UPDATED:{" "}
            {new Date(packet.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
