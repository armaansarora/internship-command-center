import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "The C-Suite" };

/** Floor 1 — CEO's Office & Agent Hub (Phase 5) */
export default async function CSuitePage() {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <div className="floor-label tracking-[0.2em] text-xs opacity-60">
        FLOOR 1 — THE C-SUITE
      </div>
      <div className="glass-card gold-border-top max-w-md w-full p-8 text-center">
        <h1 className="text-display text-xl mb-2">The C-Suite</h1>
        <p className="text-sm text-[var(--text-secondary)]">CEO orchestration and agent hub</p>
        <p className="text-data text-xs text-[var(--text-muted)] mt-4">PHASE 5 — COMING SOON</p>
      </div>
    </div>
  );
}
