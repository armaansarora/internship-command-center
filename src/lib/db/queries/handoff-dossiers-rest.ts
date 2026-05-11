/**
 * Handoff Dossiers REST helpers.
 *
 * One row per recommendation produced by a sibling agent in response to the
 * CEO orchestrator's fan-out. Rows sharing a `request_id` form a single
 * Council Table (the C-suite's structured briefing for a bell-ring turn).
 *
 * Two call sites:
 *   1. CEO orchestrator (server-side, fire-and-forget) inserts dossiers as
 *      sibling agents complete their dispatches. Writes go through
 *      `getSupabaseAdmin()` so the orchestrator can stamp rows owned by the
 *      user without holding a user-scoped session.
 *   2. Council Table UI (server component + decision route) reads via the
 *      user-scoped REST client supplied by the caller, then approves or
 *      rejects through `updateDossierDecision`. Reads are RLS-isolated;
 *      `markDossierExecuted` can accept either client because the executor
 *      may run from the user's session (Approve & send now) or the
 *      background queue (Approve & let me undo).
 *
 * Schema definition: src/db/schema.ts → handoffDossiers (§10a).
 * Migration: src/db/migrations/0028_handoff_dossiers.sql.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import type { Row } from "@/db/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Snake_case `handoff_dossiers` row. Derived from the Drizzle schema via
 * `database.types.ts` so the enums and array shapes stay in sync with the
 * live column definitions.
 */
export type DossierRow = Row<"handoff_dossiers">;

/** Status enum exposed for callers that constrain list filters. */
export type DossierStatus = DossierRow["status"];

/** Permission-needed enum. */
export type DossierPermission = DossierRow["permission_needed"];

/**
 * Input shape for `insertDossier`. Mirrors the column set with one carve-out:
 * `evidence` and `disagreement` are `unknown` because they are jsonb columns
 * whose shape evolves outside the migration boundary — caller-side schemas
 * narrow these (see PR3-Architect's `evidence` payload conventions).
 */
export interface InsertDossierInput {
  userId: string;
  requestId: string;
  dispatchId?: string | null;
  owner: string;
  requestingAgent?: string;
  task: string;
  evidence?: unknown;
  openQuestions?: string[];
  confidence?: number | null;
  disagreement?: unknown;
  proposedAction: string;
  permissionNeeded?: DossierPermission;
  deadline?: string | null;
  recommendation: string;
}

interface ListRecentOpts {
  limit?: number;
  status?: DossierStatus[];
}

const DEFAULT_RECENT_LIMIT = 20;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Insert a new dossier and return its id. Uses the service-role admin client
 * because the CEO orchestrator runs server-side fire-and-forget — the user's
 * session is not in scope when sibling-agent completions land. RLS is
 * bypassed but `user_id` is stamped from the orchestrator's request context.
 *
 * Returns "" on failure so callers can no-op without throwing through the
 * orchestrator's fan-out join.
 */
export async function insertDossier(input: InsertDossierInput): Promise<string> {
  const supabase = getSupabaseAdmin();

  const row = {
    user_id: input.userId,
    request_id: input.requestId,
    dispatch_id: input.dispatchId ?? null,
    owner: input.owner,
    requesting_agent: input.requestingAgent ?? "ceo",
    task: input.task,
    evidence: input.evidence ?? [],
    open_questions: input.openQuestions ?? [],
    confidence: input.confidence ?? null,
    disagreement: input.disagreement ?? null,
    proposed_action: input.proposedAction,
    permission_needed: input.permissionNeeded ?? "none",
    deadline: input.deadline ?? null,
    recommendation: input.recommendation,
  };

  const { data, error } = await supabase
    .from("handoff_dossiers")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    log.error("handoff_dossiers.insert_failed", undefined, {
      userId: input.userId,
      requestId: input.requestId,
      owner: input.owner,
      error: error.message,
    });
    return "";
  }

  return (data as { id: string }).id;
}

/**
 * Stamp a decision (`approved` or `rejected`) and `decided_at = now()` on a
 * dossier owned by the calling user. Caller passes their own user-scoped
 * client so RLS prevents cross-tenant writes.
 *
 * Returns the updated row, or `null` on any error / missing row.
 */
export async function updateDossierDecision(
  client: SupabaseClient,
  userId: string,
  dossierId: string,
  decision: { status: "approved" | "rejected" },
): Promise<DossierRow | null> {
  const { data, error } = await client
    .from("handoff_dossiers")
    .update({
      status: decision.status,
      decided_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", dossierId)
    .select("*")
    .maybeSingle();

  if (error) {
    log.error("handoff_dossiers.decision_failed", undefined, {
      userId,
      dossierId,
      status: decision.status,
      error: error.message,
    });
    return null;
  }

  return (data as DossierRow | null) ?? null;
}

/**
 * Flip a dossier to `executed` and stamp `executed_at` (defaulting to now).
 *
 * Accepts either an authed REST client (Approve & send now → still in the
 * user's session) or the service-role admin client (background executor
 * picking up after the undo window expires). Returns `true` on success,
 * `false` on any error path.
 */
export async function markDossierExecuted(
  adminOrClient: SupabaseClient,
  dossierId: string,
  executedAt?: string,
): Promise<boolean> {
  const stamp = executedAt ?? new Date().toISOString();

  const { error } = await adminOrClient
    .from("handoff_dossiers")
    .update({
      status: "executed",
      executed_at: stamp,
    })
    .eq("id", dossierId);

  if (error) {
    log.error("handoff_dossiers.mark_executed_failed", undefined, {
      dossierId,
      error: error.message,
    });
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch every dossier for a single bell-ring request, oldest first so the
 * Council Table renders in dispatch order. Caller-supplied client keeps RLS
 * scoping under the calling user's session (consistent with offers-rest).
 */
export async function listDossiersForRequest(
  client: SupabaseClient,
  userId: string,
  requestId: string,
): Promise<DossierRow[]> {
  const { data, error } = await client
    .from("handoff_dossiers")
    .select("*")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("handoff_dossiers.list_for_request_failed", undefined, {
      userId,
      requestId,
      error: error.message,
    });
    return [];
  }

  return (data ?? []) as DossierRow[];
}

/**
 * Recent dossiers for a user. Default limit 20, newest first. Optional
 * status filter narrows to e.g. `["ready"]` for the Council inbox count or
 * `["approved", "executed"]` for the audit drawer.
 */
export async function listRecentDossiersForUser(
  client: SupabaseClient,
  userId: string,
  opts: ListRecentOpts = {},
): Promise<DossierRow[]> {
  const limit = opts.limit ?? DEFAULT_RECENT_LIMIT;

  let query = client
    .from("handoff_dossiers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.status && opts.status.length > 0) {
    query = query.in("status", opts.status);
  }

  const { data, error } = await query;

  if (error) {
    log.error("handoff_dossiers.list_recent_failed", undefined, {
      userId,
      limit,
      statusFilter: opts.status ?? null,
      error: error.message,
    });
    return [];
  }

  return (data ?? []) as DossierRow[];
}
