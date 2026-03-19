import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Rolodex Lounge" };

/** Floor 6 — Contacts (Phase 3) */
export default async function RolodexLoungePage() {
  await requireUser();

  return (
    <FloorShell floorId="6">
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
        <div className="glass-card gold-border-top max-w-md w-full p-8 text-center">
          <h1 className="text-display text-xl mb-2">The Rolodex Lounge</h1>
          <p className="text-sm text-[var(--text-secondary)]">Contact management and networking</p>
          <p className="text-data text-xs text-[var(--text-muted)] mt-4">PHASE 3 — COMING SOON</p>
        </div>
      </div>
    </FloorShell>
  );
}
