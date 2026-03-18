import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The C-Suite" };

/** Floor 1 — CEO's Office & Agent Hub (Phase 5) */
export default async function CSuitePage() {
  await requireUser();

  return (
    <FloorShell floorId="1">
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
        <div className="glass-card gold-border-top max-w-md w-full p-8 text-center">
          <h1 className="text-display text-xl mb-2">The C-Suite</h1>
          <p className="text-sm text-[var(--text-secondary)]">CEO orchestration and agent hub</p>
          <p className="text-data text-xs text-[var(--text-muted)] mt-4">PHASE 5 — COMING SOON</p>
        </div>
      </div>
    </FloorShell>
  );
}
