"use client";

import type { JSX } from "react";
import { useState, useCallback } from "react";
import type { Document } from "@/db/schema";

// ---------------------------------------------------------------------------
// Tone types
// ---------------------------------------------------------------------------
type DocumentTone = "formal" | "conversational" | "bold";

function inferTone(content: string | null): DocumentTone {
  if (!content) return "formal";
  const lower = content.toLowerCase();
  const boldSignals = ["passion", "driven", "excited", "thrilled", "transform", "disrupt"].filter(
    (w) => lower.includes(w)
  ).length;
  const conversationalSignals = ["i've", "i'm", "you'll", "let's", "can't", "don't"].filter(
    (w) => lower.includes(w)
  ).length;
  if (boldSignals >= 2) return "bold";
  if (conversationalSignals >= 2) return "conversational";
  return "formal";
}

// ---------------------------------------------------------------------------
// Tone badge
// ---------------------------------------------------------------------------
function ToneBadge({ tone }: { tone: DocumentTone }): JSX.Element {
  const config: Record<DocumentTone, { label: string; color: string; bg: string; border: string }> = {
    formal: {
      label: "FORMAL",
      color: "#C9A84C",
      bg: "rgba(201,168,76,0.08)",
      border: "rgba(201,168,76,0.28)",
    },
    conversational: {
      label: "CONVERSATIONAL",
      color: "#7BC47B",
      bg: "rgba(123,196,123,0.08)",
      border: "rgba(123,196,123,0.28)",
    },
    bold: {
      label: "BOLD",
      color: "#DC643C",
      bg: "rgba(220,100,60,0.08)",
      border: "rgba(220,100,60,0.28)",
    },
  };

  const c = config[tone];

  return (
    <span
      aria-label={`Tone: ${c.label.toLowerCase()}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "2px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: c.color,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Version selector
// ---------------------------------------------------------------------------
interface VersionSelectorProps {
  versions: Document[];
  activeVersion: number;
  onSelect: (version: number) => void;
}

function VersionSelector({ versions, activeVersion, onSelect }: VersionSelectorProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Document version selector"
      className="flex items-center gap-1"
    >
      <span
        style={{
          fontSize: "10px",
          fontFamily: "'JetBrains Mono', monospace",
          color: "#7A5C3A",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginRight: "4px",
        }}
      >
        VERSION:
      </span>
      {versions.map((doc) => {
        const isActive = doc.version === activeVersion;
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelect(doc.version ?? 1)}
            aria-label={`Select version ${doc.version}`}
            aria-pressed={isActive}
            style={{
              padding: "2px 8px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              fontWeight: isActive ? 700 : 400,
              color: isActive ? "#C9A84C" : "#5A3E20",
              backgroundColor: isActive ? "rgba(201,168,76,0.12)" : "transparent",
              border: `1px solid ${isActive ? "rgba(201,168,76,0.4)" : "#2A1C12"}`,
              borderRadius: "2px",
              cursor: "pointer",
              transition: "background 0.15s ease, color 0.15s ease",
              outline: "none",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(201,168,76,0.4)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "none";
            }}
          >
            V{doc.version}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DocumentEditorProps {
  /** The active document to display */
  document: Document | null;
  /** All versions of this document (same applicationId, same title) */
  versions?: Document[];
  /** The company name for the linked application */
  companyName?: string | null;
  /** The role name for the linked application */
  roleName?: string | null;
  /** Callback when user clicks "Refine with CMO" */
  onRequestRefinement?: (document: Document) => void;
  /** Callback when version is switched */
  onVersionSelect?: (version: number) => void;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState(): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ padding: "48px 24px" }}
      aria-label="No document selected"
    >
      {/* Ruled lines placeholder */}
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          maxWidth: "320px",
          padding: "24px",
          borderRadius: "4px",
          border: "1px solid rgba(201,168,76,0.08)",
          backgroundColor: "rgba(201,168,76,0.02)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ruled lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: "1px",
              backgroundColor: "rgba(201,168,76,0.06)",
              marginBottom: "16px",
              width: i === 2 ? "65%" : i === 5 ? "40%" : "100%",
            }}
          />
        ))}
        {/* Cursor blink */}
        <div
          aria-hidden="true"
          className="cursor-blink"
          style={{
            width: "2px",
            height: "14px",
            backgroundColor: "rgba(201,168,76,0.45)",
            display: "inline-block",
          }}
        />
        {/* Left margin rule */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "15%",
            width: "1px",
            background: "rgba(180,60,60,0.06)",
          }}
        />
      </div>
      <p
        className="mt-6"
        style={{
          fontSize: "13px",
          fontFamily: "'JetBrains Mono', monospace",
          color: "#5A3E20",
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        SELECT A DOCUMENT TO BEGIN
      </p>
      <p
        className="mt-1"
        style={{
          fontSize: "12px",
          fontFamily: "'Satoshi', system-ui, sans-serif",
          color: "#3A2510",
          textAlign: "center",
        }}
      >
        Choose a cover letter from the list, or ask the CMO to draft a new one.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function DocumentEditor({
  document,
  versions = [],
  companyName,
  roleName,
  onRequestRefinement,
  onVersionSelect,
}: DocumentEditorProps): JSX.Element {
  const [activeVersion, setActiveVersion] = useState<number>(document?.version ?? 1);

  const handleVersionSelect = useCallback(
    (version: number) => {
      setActiveVersion(version);
      onVersionSelect?.(version);
    },
    [onVersionSelect]
  );

  // Determine the active document among all versions
  const activeDoc =
    versions.find((v) => v.version === activeVersion) ?? document;

  const tone = inferTone(activeDoc?.content ?? null);
  const wordCount = activeDoc?.content
    ? activeDoc.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  if (!document) {
    return <EmptyState />;
  }

  return (
    <div
      role="region"
      aria-label={`Document editor: ${document.title ?? "Untitled"}`}
      className="flex flex-col h-full"
      style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}
    >
      {/* ── Document header ── */}
      <div
        className="flex-shrink-0 px-5 py-3 flex flex-col gap-2"
        style={{
          borderBottom: "1px solid #2A1C12",
          backgroundColor: "#211510",
        }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#F5E6C8",
                fontFamily: "'Playfair Display', Georgia, serif",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={document.title ?? "Untitled"}
            >
              {document.title ?? "Untitled Cover Letter"}
            </h2>
            {(companyName || roleName) && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#7A5C3A",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {[companyName, roleName].filter(Boolean).join(" — ")}
              </p>
            )}
          </div>

          {/* Refine with CMO button */}
          <button
            type="button"
            onClick={() => activeDoc && onRequestRefinement?.(activeDoc)}
            disabled={!activeDoc}
            aria-label="Refine this cover letter with CMO"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              backgroundColor: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.35)",
              borderRadius: "2px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#C9A84C",
              cursor: activeDoc ? "pointer" : "not-allowed",
              opacity: activeDoc ? 1 : 0.4,
              transition: "background 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (activeDoc) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(201,168,76,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(201,168,76,0.1)";
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(201,168,76,0.4)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "none";
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              {/* Quill icon */}
              <path
                d="M9 1C9 1 6.5 2 4 5.5C2.5 7.5 2.5 9 2.5 9L3.2 8.3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M2.5 9C2.5 9 2 7.5 2.5 7C3 6.5 3 8 3 8"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </svg>
            REFINE WITH CMO
          </button>
        </div>

        {/* Meta row — version, tone, word count */}
        <div className="flex items-center gap-3 flex-wrap">
          {versions.length > 1 && (
            <VersionSelector
              versions={versions}
              activeVersion={activeVersion}
              onSelect={handleVersionSelect}
            />
          )}

          <ToneBadge tone={tone} />

          <span
            aria-label={`Word count: ${wordCount}`}
            style={{
              fontSize: "10px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#5A3E20",
            }}
          >
            {wordCount} WORDS
          </span>
        </div>
      </div>

      {/* ── Document content area ── */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#3A2510 #1A1008",
          position: "relative",
        }}
      >
        {/* Left margin rule — notebook feel */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "10%",
            width: "1px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(180,60,60,0.06) 10%, rgba(180,60,60,0.05) 90%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Ruled lines background */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(201,168,76,0.03) 27px, rgba(201,168,76,0.03) 28px)",
            backgroundSize: "100% 28px",
            pointerEvents: "none",
          }}
        />

        {activeDoc?.content ? (
          <div
            role="article"
            aria-label="Cover letter content"
            style={{
              position: "relative",
              fontSize: "14px",
              lineHeight: "28px", // Matches ruled line spacing
              color: "#F5E6C8",
              fontFamily: "'Satoshi', system-ui, sans-serif",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              paddingLeft: "5%",
              maxWidth: "72ch",
            }}
          >
            {activeDoc.content}
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              color: "#3A2510",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              paddingLeft: "5%",
              paddingTop: "8px",
            }}
          >
            {/* Empty document — show blink cursor */}
            No content yet. Ask the CMO to draft this letter.
            <span
              aria-hidden="true"
              className="cursor-blink"
              style={{
                display: "inline-block",
                width: "2px",
                height: "14px",
                backgroundColor: "rgba(201,168,76,0.5)",
                verticalAlign: "middle",
                marginLeft: "4px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
