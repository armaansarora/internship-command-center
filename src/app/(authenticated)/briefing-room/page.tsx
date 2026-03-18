import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Briefing Room" };

/** Floor 3 — Interview Prep (Phase 4) */
export default async function BriefingRoomPage() {
  await requireUser();

  return (
    <FloorShell floorId="3">
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
        <div className="glass-card gold-border-top max-w-md w-full p-8 text-center">
          <h1 className="text-display text-xl mb-2">The Briefing Room</h1>
          <p className="text-sm text-[var(--text-secondary)]">Interview preparation packets</p>
          <p className="text-data text-xs text-[var(--text-muted)] mt-4">PHASE 4 — COMING SOON</p>
        </div>
      </div>
    </FloorShell>
  );
}
