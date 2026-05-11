import type { JSX } from "react";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { createClient } from "@/lib/supabase/server";
import { listRecentDossiersForUser } from "@/lib/db/queries/handoff-dossiers-rest";
import { CouncilTableServerActions } from "./council-table-actions";

/**
 * Server component that hydrates the Council Table on the C-Suite floor.
 *
 * Strict feature gate: when `GATE_CONFIG.flags.councilTableEnabled()` returns
 * false the component renders `null` and the surface is invisible to anyone
 * without the env flag flipped. That keeps PR3 dark-launchable; we can flip
 * `TOWER_COUNCIL_TABLE=1` per-deployment without merging code.
 *
 * Data flow:
 *   1. Get the user-scoped Supabase REST client (RLS isolated).
 *   2. Pull the most recent 20 dossiers via `listRecentDossiersForUser`.
 *   3. Hand the array + a parent-supplied action wrapper to the client
 *      component. The action wrapper is a thin client component that owns
 *      the server-action invocation; this server section stays free of
 *      mutation logic so it can be cleanly tested for read-side correctness.
 */
export interface CouncilTableSectionProps {
  userId: string;
}

export async function CouncilTableSection({
  userId,
}: CouncilTableSectionProps): Promise<JSX.Element | null> {
  if (!GATE_CONFIG.flags.councilTableEnabled()) {
    return null;
  }

  const supabase = await createClient();
  const dossiers = await listRecentDossiersForUser(supabase, userId, {
    limit: 20,
  });

  return (
    <section
      data-testid="council-table-section"
      aria-label="Council Table — handoff dossiers"
      style={{
        position: "relative",
        zIndex: 10,
        padding: "24px 24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "1240px",
        margin: "0 auto",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(1.2rem, 2vw, 1.6rem)",
            fontWeight: 700,
            color: "rgba(232, 201, 106, 0.95)",
            letterSpacing: "0.02em",
          }}
        >
          The Council Table
        </h2>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(184, 184, 200, 0.7)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Witnessed Handoffs
        </span>
      </header>

      {/* Wrap CouncilTable in the client-side action shell. The shell owns
          the server-action invocations + optimistic refresh. */}
      <CouncilTableServerActions dossiers={dossiers} />
    </section>
  );
}

export default CouncilTableSection;
