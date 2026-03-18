import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "The War Room" };

/** Floor 7 — Applications (Phase 1) */
export default async function WarRoomPage() {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <div className="floor-label tracking-[0.2em] text-xs opacity-60">
        FLOOR 7 — THE WAR ROOM
      </div>
      <div className="glass-card gold-border-top max-w-md w-full p-8 text-center">
        <h1 className="text-display text-xl mb-2">The War Room</h1>
        <p className="text-sm text-[var(--text-secondary)]">Application pipeline management</p>
        <p className="text-data text-xs text-[var(--text-muted)] mt-4">PHASE 1 — COMING SOON</p>
      </div>
    </div>
  );
}
