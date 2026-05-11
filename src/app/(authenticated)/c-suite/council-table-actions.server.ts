"use server";

/**
 * Council Table decision server actions.
 *
 * Two minimal actions back the Approve / Reject buttons on each
 * DepartmentLane. Both delegate to PR3-Backend's
 * `updateDossierDecision`, which is RLS-scoped to the calling user so the
 * caller can never decide on someone else's dossier even with a leaked id.
 *
 * The Council Table is the witnessed decision surface; the action does NOT
 * execute the proposed work — it only stamps the dossier's decision. A
 * follow-up executor (separate concern) reads `status = approved` rows and
 * performs the side effect with audit logging.
 */

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { updateDossierDecision } from "@/lib/db/queries/handoff-dossiers-rest";
import type { Dossier } from "@/components/c-suite/HandoffDossierCard";

export type CouncilDecisionResult =
  | { ok: true; dossier: Dossier }
  | { ok: false; error: string };

async function decideDossier(
  dossierId: string,
  decision: "approved" | "rejected",
): Promise<CouncilDecisionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createClient();
  const row = await updateDossierDecision(supabase, user.id, dossierId, {
    status: decision,
  });
  if (!row) return { ok: false, error: "decision_failed" };

  revalidatePath("/c-suite");
  return { ok: true, dossier: row };
}

export async function approveDossierAction(
  dossierId: string,
): Promise<CouncilDecisionResult> {
  return decideDossier(dossierId, "approved");
}

export async function rejectDossierAction(
  dossierId: string,
): Promise<CouncilDecisionResult> {
  return decideDossier(dossierId, "rejected");
}
