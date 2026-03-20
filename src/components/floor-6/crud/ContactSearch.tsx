"use client";

import type { JSX } from "react";
import { useState, useCallback } from "react";

export type WarmthFilter = "warm" | "cooling" | "cold" | "all";
export type RelationshipFilter =
  | "alumni"
  | "recruiter"
  | "referral"
  | "cold"
  | "warm_intro"
  | "all";
export type SortOption = "warmth" | "name" | "company" | "last_contact";

export interface ContactSearchParams {
  query: string;
  warmth: WarmthFilter;
  relationship: RelationshipFilter;
  sort: SortOption;
}

interface ContactSearchProps {
  onSearch: (params: ContactSearchParams) => void;
  totalCount: number;
  filteredCount: number;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------
const inputBase: React.CSSProperties = {
  backgroundColor: "rgba(35, 21, 8, 0.8)",
  border: "1px solid rgba(92, 58, 30, 0.7)",
  borderRadius: "2px",
  color: "#FDF3E8",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "12px",
  outline: "none",
  transition: "border-color 0.15s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7A5B35",
  marginBottom: "4px",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ContactSearch({
  onSearch,
  totalCount,
  filteredCount,
}: ContactSearchProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [warmth, setWarmth] = useState<WarmthFilter>("all");
  const [relationship, setRelationship] = useState<RelationshipFilter>("all");
  const [sort, setSort] = useState<SortOption>("warmth");

  const emit = useCallback(
    (
      q: string,
      w: WarmthFilter,
      r: RelationshipFilter,
      s: SortOption
    ) => {
      onSearch({ query: q, warmth: w, relationship: r, sort: s });
    },
    [onSearch]
  );

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      emit(q, warmth, relationship, sort);
    },
    [warmth, relationship, sort, emit]
  );

  const handleWarmthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const w = e.target.value as WarmthFilter;
      setWarmth(w);
      emit(query, w, relationship, sort);
    },
    [query, relationship, sort, emit]
  );

  const handleRelationshipChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const r = e.target.value as RelationshipFilter;
      setRelationship(r);
      emit(query, warmth, r, sort);
    },
    [query, warmth, sort, emit]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const s = e.target.value as SortOption;
      setSort(s);
      emit(query, warmth, relationship, s);
    },
    [query, warmth, relationship, emit]
  );

  const hasFilter = query.trim() || warmth !== "all" || relationship !== "all";

  return (
    <div
      role="search"
      aria-label="Search and filter contacts"
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {/* Top row: text search + count */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <label htmlFor="contact-search-input" style={labelStyle}>
            Search
          </label>
          <input
            id="contact-search-input"
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder="Name, company, email..."
            aria-label="Search contacts by name, company, or email"
            style={{ ...inputBase, width: "100%", padding: "7px 10px" }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "rgba(201, 168, 76, 0.5)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "rgba(92, 58, 30, 0.7)";
            }}
          />
        </div>

        {/* Result count */}
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "10px",
            color: "#7A5B35",
            whiteSpace: "nowrap",
            alignSelf: "flex-end",
            paddingBottom: "8px",
          }}
        >
          {hasFilter
            ? `${filteredCount} / ${totalCount}`
            : `${totalCount} total`}
        </div>
      </div>

      {/* Filter row: warmth + relationship + sort */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {/* Warmth filter */}
        <div style={{ minWidth: "120px" }}>
          <label htmlFor="warmth-filter" style={labelStyle}>
            Warmth
          </label>
          <select
            id="warmth-filter"
            value={warmth}
            onChange={handleWarmthChange}
            aria-label="Filter by warmth level"
            style={{ ...inputBase, width: "100%", padding: "6px 8px", cursor: "pointer" }}
          >
            <option value="all">All levels</option>
            <option value="warm">Warm</option>
            <option value="cooling">Cooling</option>
            <option value="cold">Cold</option>
          </select>
        </div>

        {/* Relationship filter */}
        <div style={{ minWidth: "140px" }}>
          <label htmlFor="relationship-filter" style={labelStyle}>
            Relationship
          </label>
          <select
            id="relationship-filter"
            value={relationship}
            onChange={handleRelationshipChange}
            aria-label="Filter by relationship type"
            style={{ ...inputBase, width: "100%", padding: "6px 8px", cursor: "pointer" }}
          >
            <option value="all">All types</option>
            <option value="alumni">Alumni</option>
            <option value="recruiter">Recruiter</option>
            <option value="referral">Referral</option>
            <option value="warm_intro">Warm Intro</option>
            <option value="cold">Cold Outreach</option>
          </select>
        </div>

        {/* Sort */}
        <div style={{ minWidth: "140px" }}>
          <label htmlFor="sort-contacts" style={labelStyle}>
            Sort by
          </label>
          <select
            id="sort-contacts"
            value={sort}
            onChange={handleSortChange}
            aria-label="Sort contacts"
            style={{ ...inputBase, width: "100%", padding: "6px 8px", cursor: "pointer" }}
          >
            <option value="warmth">Warmth</option>
            <option value="name">Name</option>
            <option value="company">Company</option>
            <option value="last_contact">Last Contact</option>
          </select>
        </div>
      </div>
    </div>
  );
}
