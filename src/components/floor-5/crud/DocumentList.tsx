"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import type { Document } from "@/db/schema";

// ---------------------------------------------------------------------------
// Warmth helpers — how recently updated
// ---------------------------------------------------------------------------
type WarmthLevel = "hot" | "warm" | "cool" | "cold";

function getWarmth(updatedAt: Date | null): WarmthLevel {
  if (!updatedAt) return "cold";
  const ageMs = Date.now() - updatedAt.getTime();
  const ageHours = ageMs / 3_600_000;
  if (ageHours < 2) return "hot";
  if (ageHours < 24) return "warm";
  if (ageHours < 72) return "cool";
  return "cold";
}

const WARMTH_CONFIG: Record<WarmthLevel, { color: string; glow: string; label: string }> = {
  hot:  { color: "#F5C842", glow: "rgba(245,200,66,0.4)",  label: "HOT"  },
  warm: { color: "#C9A84C", glow: "rgba(201,168,76,0.3)",  label: "WARM" },
  cool: { color: "#7A5C3A", glow: "rgba(122,92,58,0.2)",   label: "COOL" },
  cold: { color: "#3A2510", glow: "none",                  label: "COLD" },
};

function formatTimeAgo(date: Date | null): string {
  if (!date) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ---------------------------------------------------------------------------
// Single document row card
// ---------------------------------------------------------------------------
interface DocumentRowProps {
  document: Document;
  versionCount: number;
  companyName?: string | null;
  roleName?: string | null;
  isSelected: boolean;
  onSelect: (doc: Document) => void;
}

function DocumentRow({
  document,
  versionCount,
  companyName,
  roleName,
  isSelected,
  onSelect,
}: DocumentRowProps): JSX.Element {
  const updatedAt = document.updatedAt ? new Date(document.updatedAt) : null;
  const warmth = getWarmth(updatedAt);
  const warmthCfg = WARMTH_CONFIG[warmth];
  const timeAgo = formatTimeAgo(updatedAt);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      aria-label={`Cover letter: ${document.title ?? "Untitled"}, for ${companyName ?? "unknown company"}, ${versionCount} version${versionCount !== 1 ? "s" : ""}, updated ${timeAgo}`}
      onClick={() => onSelect(document)}
      className="w-full text-left"
      style={{
        display: "block",
        padding: "10px 14px",
        backgroundColor: isSelected
          ? "rgba(201,168,76,0.1)"
          : "transparent",
        border: "1px solid",
        borderColor: isSelected
          ? "rgba(201,168,76,0.35)"
          : "rgba(42,28,18,0.8)",
        borderRadius: "3px",
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
        outline: "none",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(201,168,76,0.06)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(42,28,18,0.8)";
        }
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(201,168,76,0.35)";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.outline = "none";
      }}
    >
      {/* Top row — warmth indicator + title */}
      <div className="flex items-start gap-2">
        {/* Warmth dot */}
        <span
          aria-hidden="true"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: warmthCfg.color,
            boxShadow: warmth !== "cold" ? `0 0 4px ${warmthCfg.glow}` : undefined,
            flexShrink: 0,
            marginTop: "4px",
            display: "inline-block",
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Document title */}
          <p
            style={{
              fontSize: "13px",
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? "#F5E6C8" : "#C8A878",
              fontFamily: "'Satoshi', system-ui, sans-serif",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "color 0.15s ease",
            }}
          >
            {document.title ?? "Untitled Cover Letter"}
          </p>

          {/* Company + role */}
          {(companyName || roleName) && (
            <p
              style={{
                fontSize: "11px",
                color: "#5A3E20",
                fontFamily: "'JetBrains Mono', monospace",
                margin: "1px 0 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {[companyName, roleName].filter(Boolean).join(" — ")}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row — version count, warmth label, time ago */}
      <div
        className="flex items-center justify-between mt-2"
        style={{ paddingLeft: "14px" }}
      >
        <div className="flex items-center gap-2">
          {/* Version count badge */}
          {versionCount > 1 && (
            <span
              aria-hidden="true"
              style={{
                fontSize: "9px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#C9A84C",
                backgroundColor: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: "2px",
                padding: "1px 5px",
                letterSpacing: "0.05em",
              }}
            >
              V{document.version ?? 1} / {versionCount}
            </span>
          )}
          {/* Warmth label */}
          <span
            aria-hidden="true"
            style={{
              fontSize: "9px",
              fontFamily: "'JetBrains Mono', monospace",
              color: warmthCfg.color,
              letterSpacing: "0.06em",
            }}
          >
            {warmthCfg.label}
          </span>
        </div>

        {/* Time ago */}
        <span
          aria-hidden="true"
          style={{
            fontSize: "10px",
            fontFamily: "'JetBrains Mono', monospace",
            color: "#3A2510",
          }}
        >
          {timeAgo}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Search input
// ---------------------------------------------------------------------------
function DocumentSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <div style={{ position: "relative" }}>
      <label htmlFor="doc-search" className="sr-only">
        Search cover letters
      </label>
      <input
        id="doc-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search letters..."
        aria-label="Search cover letters"
        style={{
          width: "100%",
          padding: "7px 10px 7px 32px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          color: "#C8A878",
          backgroundColor: "rgba(33,21,16,0.7)",
          border: "1px solid #2A1C12",
          borderRadius: "3px",
          outline: "none",
          caretColor: "#C9A84C",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(201,168,76,0.4)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = "#2A1C12";
        }}
      />
      {/* Search icon */}
      <svg
        aria-hidden="true"
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        style={{
          position: "absolute",
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <circle cx="5.5" cy="5.5" r="4" stroke="#5A3E20" strokeWidth="1.25" />
        <path d="M8.5 8.5L11 11" stroke="#5A3E20" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DocumentListProps {
  /** All cover letter documents */
  documents: Document[];
  /** Map from applicationId → companyName */
  companyNames?: Record<string, string>;
  /** Map from applicationId → roleName */
  roleNames?: Record<string, string>;
  /** Map from document id → version count for that document group */
  versionCounts?: Record<string, number>;
  /** The currently selected document id */
  selectedId?: string | null;
  /** Callback when a document is selected */
  onSelect: (doc: Document) => void;
  /** Callback when user wants to create a new cover letter */
  onNew?: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function DocumentList({
  documents,
  companyNames = {},
  roleNames = {},
  versionCounts = {},
  selectedId,
  onSelect,
  onNew,
}: DocumentListProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((doc) => {
      const title = (doc.title ?? "").toLowerCase();
      const company = (companyNames[doc.applicationId ?? ""] ?? "").toLowerCase();
      const role = (roleNames[doc.applicationId ?? ""] ?? "").toLowerCase();
      return title.includes(q) || company.includes(q) || role.includes(q);
    });
  }, [documents, searchQuery, companyNames, roleNames]);

  const handleNew = useCallback(() => {
    onNew?.();
  }, [onNew]);

  return (
    <div
      role="region"
      aria-label="Cover letter list"
      className="flex flex-col h-full"
      style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          borderBottom: "1px solid #2A1C12",
          backgroundColor: "#211510",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            style={{
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#7A5C3A",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            COVER LETTERS ({documents.length})
          </h3>

          {/* New document button */}
          <button
            type="button"
            onClick={handleNew}
            aria-label="Create new cover letter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              backgroundColor: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: "2px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#C9A84C",
              cursor: "pointer",
              transition: "background 0.15s ease",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(201,168,76,0.16)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(201,168,76,0.08)";
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(201,168,76,0.4)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "none";
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M4.5 1V8M1 4.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            NEW
          </button>
        </div>

        {/* Search */}
        <DocumentSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* ── List ── */}
      <div
        role="listbox"
        aria-label="Cover letters"
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#3A2510 #1A1008" }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#3A2510",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
            }}
          >
            {searchQuery ? (
              <>No letters match &ldquo;{searchQuery}&rdquo;</>
            ) : (
              <>
                <p>No cover letters yet.</p>
                <p className="mt-1" style={{ fontSize: "11px" }}>
                  Ask the CMO to draft your first one.
                </p>
              </>
            )}
          </div>
        )}

        {filtered.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            versionCount={versionCounts[doc.id] ?? 1}
            companyName={companyNames[doc.applicationId ?? ""] ?? null}
            roleName={roleNames[doc.applicationId ?? ""] ?? null}
            isSelected={selectedId === doc.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
