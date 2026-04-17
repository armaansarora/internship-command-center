import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { CSuiteClient } from "@/components/floor-1/CSuiteClient";

export const metadata: Metadata = { title: "The C-Suite | The Tower" };

/** Floor 1 — The C-Suite (CEO Orchestration).
 *
 * Skyline paints immediately; CEO orchestration data streams into the
 * Suspense boundary so first paint isn't blocked.
 */
export default async function CSuitePage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="1">
      <Suspense fallback={<CSuitePlaceholder />}>
        <CSuiteData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function CSuiteData({ userId }: { userId: string }): Promise<JSX.Element> {
  const stats = await getPipelineStatsRest(userId);
  return <CSuiteClient stats={stats} />;
}

function CSuitePlaceholder(): JSX.Element {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading C-Suite"
    >
      <div className="flex flex-col items-center gap-4" aria-hidden="true">
        <span className="block w-px h-12 bg-gradient-to-b from-transparent via-[var(--gold)] to-transparent motion-safe:animate-[cs-pulse_2200ms_ease-in-out_infinite]" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold-dim)]">
          Convening leadership
        </span>
      </div>
      <span className="sr-only">Loading C-Suite data…</span>
      <style>{`
        @keyframes cs-pulse {
          0%, 100% { opacity: 0.3; transform: translateY(4px); }
          50%      { opacity: 1;   transform: translateY(-4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
