import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { ObservatoryClient } from "@/components/floor-2/ObservatoryClient";

export const metadata: Metadata = { title: "The Observatory | The Tower" };

/** Floor 2 — The Observatory (CFO Analytics).
 *
 * Skyline + window mullions paint immediately; analytics stream into the
 * Suspense boundary so a slow stats query never delays first paint.
 */
export default async function ObservatoryPage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="2">
      <Suspense fallback={<ObservatoryPlaceholder />}>
        <ObservatoryData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function ObservatoryData({ userId }: { userId: string }): Promise<JSX.Element> {
  const stats = await getPipelineStatsRest(userId);
  return <ObservatoryClient stats={stats} />;
}

function ObservatoryPlaceholder(): JSX.Element {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading observatory"
    >
      <div className="flex flex-col items-center gap-4" aria-hidden="true">
        <span className="block w-px h-12 bg-gradient-to-b from-transparent via-[var(--gold)] to-transparent motion-safe:animate-[obs-pulse_2200ms_ease-in-out_infinite]" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold-dim)]">
          Calibrating instruments
        </span>
      </div>
      <span className="sr-only">Loading observatory analytics…</span>
      <style>{`
        @keyframes obs-pulse {
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
