import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = {
  title: "The Penthouse",
};

/**
 * Floor PH — The Penthouse (Dashboard)
 * Phase 0.8 builds the full glass + gold dashboard with real Supabase data.
 * This placeholder proves auth routing + world shell work together.
 */
export default async function PenthousePage() {
  const user = await requireUser();

  return (
    <FloorShell floorId="PH">
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
        <div className="glass-card gold-border-top max-w-lg w-full p-8">
          <h1 className="text-display text-xl mb-4">The Penthouse</h1>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>
              Signed in as{" "}
              <span className="text-data text-[var(--gold)]">{user.email}</span>
            </p>
            <p>
              User ID:{" "}
              <span className="text-data text-xs text-[var(--text-muted)]">
                {user.id}
              </span>
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: "Applications", value: "—" },
              { label: "Pipeline", value: "—" },
              { label: "Interviews", value: "—" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-lg p-4 text-center"
              >
                <div className="text-data text-lg text-[var(--gold)]">
                  {stat.value}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-data text-xs text-[var(--text-muted)]">
          PHASE 0 — DASHBOARD PLACEHOLDER
        </p>
      </div>
    </FloorShell>
  );
}
