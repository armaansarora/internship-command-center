import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "The Situation Room" };

/** Floor 4 — Follow-ups & Calendar (Phase 2) */
export default async function SituationRoomPage() {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <div className="floor-label tracking-[0.2em] text-xs opacity-60">
        FLOOR 4 — THE SITUATION ROOM
      </div>
      <div className="glass-card gold-border-top max-w-md w-full p-8 text-center">
        <h1 className="text-display text-xl mb-2">The Situation Room</h1>
        <p className="text-sm text-[var(--text-secondary)]">Email follow-ups and calendar sync</p>
        <p className="text-data text-xs text-[var(--text-muted)] mt-4">PHASE 2 — COMING SOON</p>
      </div>
    </div>
  );
}
