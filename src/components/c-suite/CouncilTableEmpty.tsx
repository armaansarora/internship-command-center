"use client";

import type { JSX } from "react";

/**
 * Council Table empty state.
 *
 * Surfaced when the user has never had a Council convene yet — the CEO
 * orchestrator hasn't fanned out work that emitted dossiers. Kept as a
 * separate component so the copy is testable in isolation and so the parent
 * `CouncilTable` can stay branchless on the empty path.
 *
 * Voice tries to reinforce the building metaphor: there's no "no data" — the
 * Council simply hasn't been summoned. Friendly, not apologetic.
 */
export function CouncilTableEmpty(): JSX.Element {
  return (
    <section
      data-testid="council-table-empty"
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 24px",
        gap: "12px",
        borderRadius: "14px",
        background:
          "linear-gradient(180deg, rgba(26, 26, 46, 0.6) 0%, rgba(20, 20, 36, 0.6) 100%)",
        border: "1px dashed rgba(201, 168, 76, 0.32)",
        color: "rgba(232, 232, 240, 0.92)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(201, 168, 76, 0.7)",
        }}
      >
        Council Table
      </span>
      <h3
        style={{
          margin: 0,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.15rem",
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: "rgba(245, 245, 250, 0.96)",
        }}
      >
        No council convenings yet.
      </h3>
      <p
        style={{
          margin: 0,
          maxWidth: "440px",
          fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "13px",
          lineHeight: 1.55,
          color: "rgba(200, 200, 215, 0.85)",
        }}
      >
        The CEO will summon a table when work fans out across departments —
        rings of dossiers, one per agent, with witnessed approvals.
      </p>
    </section>
  );
}
