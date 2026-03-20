"use client";

import type { JSX } from "react";
import { useState, useEffect, useRef, useCallback } from "react";

interface ApplicationSearchProps {
  onSearch: (query: string) => void;
  onFilterStatus: (statuses: string[]) => void;
  totalCount: number;
}

const STATUS_FILTERS = [
  { value: "discovered", label: "RECON", color: "#4A7A9B" },
  { value: "applied", label: "OPS SUBMITTED", color: "#1E90FF" },
  { value: "screening", label: "FIRST CONTACT", color: "#00D4FF" },
  { value: "interview_scheduled", label: "INTERVIEW", color: "#F59E0B" },
  { value: "interviewing", label: "ACTIVE", color: "#F59E0B" },
  { value: "under_review", label: "INTEL REVIEW", color: "#F59E0B" },
  { value: "offer", label: "MISSION SUCCESS", color: "#00FF87" },
  { value: "accepted", label: "ACCEPTED", color: "#00FF87" },
  { value: "rejected", label: "REJECTED", color: "#DC3C3C" },
  { value: "withdrawn", label: "WITHDRAWN", color: "#4A7A9B" },
] as const;

export function ApplicationSearch({
  onSearch,
  onFilterStatus,
  totalCount,
}: ApplicationSearchProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleStatus = useCallback(
    (status: string) => {
      setActiveStatuses((prev) => {
        const next = new Set(prev);
        if (next.has(status)) {
          next.delete(status);
        } else {
          next.add(status);
        }
        onFilterStatus(Array.from(next));
        return next;
      });
    },
    [onFilterStatus]
  );

  const clearFilters = useCallback(() => {
    setActiveStatuses(new Set());
    setQuery("");
    onSearch("");
    onFilterStatus([]);
  }, [onSearch, onFilterStatus]);

  const hasActiveFilters = activeStatuses.size > 0 || query.length > 0;

  return (
    <div
      role="search"
      aria-label="Search and filter applications"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Top bar: search input + count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* Search input */}
        <div
          style={{
            flex: 1,
            position: "relative",
            maxWidth: "380px",
          }}
        >
          {/* Magnifying glass icon */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#4A7A9B",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8.5 8.5L11 11"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="SEARCH TARGETS..."
            aria-label="Search applications by company or role"
            style={{
              width: "100%",
              background: "rgba(10, 22, 40, 0.8)",
              border: "1px solid rgba(30, 58, 95, 0.8)",
              borderRadius: "2px",
              padding: "7px 10px 7px 30px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "#E8F4FD",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "rgba(30, 144, 255, 0.6)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "rgba(30, 58, 95, 0.8)";
            }}
          />
        </div>

        {/* Application count */}
        <div
          aria-label={`${totalCount} total applications`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 12px",
            background: "rgba(15, 31, 61, 0.6)",
            border: "1px solid rgba(30, 58, 95, 0.6)",
            borderRadius: "2px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              color: "#4A7A9B",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            INTEL
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "13px",
              fontWeight: 700,
              color: "#1E90FF",
            }}
          >
            {totalCount}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              color: "#4A7A9B",
              letterSpacing: "0.04em",
            }}
          >
            FILES
          </span>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            aria-label="Clear all filters and search"
            style={{
              padding: "7px 12px",
              background: "rgba(220, 60, 60, 0.08)",
              border: "1px solid rgba(220, 60, 60, 0.25)",
              borderRadius: "2px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#DC3C3C",
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "background 0.15s ease",
              outline: "none",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(220, 60, 60, 0.16)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(220, 60, 60, 0.08)";
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline =
                "2px solid rgba(220, 60, 60, 0.4)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "none";
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div
        role="group"
        aria-label="Filter by application status"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeStatuses.has(filter.value);
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => toggleStatus(filter.value)}
              aria-pressed={isActive}
              aria-label={`Filter by ${filter.label} status`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "22px",
                padding: "0 8px",
                background: isActive ? `${filter.color}22` : "rgba(10, 22, 40, 0.6)",
                border: `1px solid ${isActive ? `${filter.color}77` : "rgba(30, 58, 95, 0.6)"}`,
                borderRadius: "2px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "9px",
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.08em",
                color: isActive ? filter.color : "#4A7A9B",
                cursor: "pointer",
                textTransform: "uppercase",
                transition:
                  "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = `${filter.color}44`;
                  el.style.color = filter.color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "rgba(30, 58, 95, 0.6)";
                  el.style.color = "#4A7A9B";
                }
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLButtonElement).style.outline =
                  `2px solid ${filter.color}55`;
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLButtonElement).style.outline = "none";
              }}
            >
              {isActive && (
                <span aria-hidden="true" style={{ marginRight: "4px", fontSize: "8px" }}>
                  ●
                </span>
              )}
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Active filter summary for screen readers */}
      {activeStatuses.size > 0 && (
        <p
          role="status"
          aria-live="polite"
          style={{ position: "absolute", left: "-9999px" }}
        >
          {activeStatuses.size} status filter{activeStatuses.size !== 1 ? "s" : ""} active:{" "}
          {Array.from(activeStatuses).join(", ")}
        </p>
      )}
    </div>
  );
}
