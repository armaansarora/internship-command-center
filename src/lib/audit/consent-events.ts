/**
 * Networking-consent audit event helpers (PR4 — Trust Console).
 *
 * The original Codex-RiskCompliance review flagged that revoking networking
 * consent left no auditable trail the user could inspect. This module is the
 * fire-and-forget writer side of that loop:
 *
 *   networking_opted_in               -> stamped when the user grants consent
 *                                       (via /api/networking/opt-in).
 *   networking_revoked                -> stamped when the revoke cascade
 *                                       completes successfully — records
 *                                       items erased, tables touched, and
 *                                       wall-clock duration so the user can
 *                                       see proof of the "60 second" promise.
 *   networking_revoke_cascade_failed  -> stamped when any step in the
 *                                       cascade short-circuits. Surfaces the
 *                                       error message so support can triage
 *                                       without re-running the request.
 *   consent_version_stale_denial      -> stamped when assertConsented
 *                                       refuses a request because the user
 *                                       is on an older consent copy and has
 *                                       not re-acknowledged the addendum.
 *
 * Writes go directly through the service-role admin client. We do NOT route
 * through `logSecurityEvent` because that helper's `AuditEventType` union is
 * intentionally pinned to the existing event list — extending it would couple
 * PR4 to a separate review surface. The DB-level CHECK constraint
 * (`audit_logs_event_type_check`) is the single source of truth and is
 * extended by migration `0029_trust_console_audit.sql`.
 *
 * Every exported function returns `Promise<void>` and never throws — calling
 * code can `await` for ordering without wrapping in try/catch.
 */
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Event-type string constants (typed narrow, exported for call-site use).
// Pinning them to the literal type means consumers cannot pass a stale or
// misspelled string — the union below is the single source of truth.
// ---------------------------------------------------------------------------

export const EVENT_NETWORKING_OPTED_IN = "networking_opted_in" as const;
export const EVENT_NETWORKING_REVOKED = "networking_revoked" as const;
export const EVENT_NETWORKING_REVOKE_CASCADE_FAILED =
  "networking_revoke_cascade_failed" as const;
export const EVENT_CONSENT_VERSION_STALE_DENIAL =
  "consent_version_stale_denial" as const;

export type ConsentEventType =
  | typeof EVENT_NETWORKING_OPTED_IN
  | typeof EVENT_NETWORKING_REVOKED
  | typeof EVENT_NETWORKING_REVOKE_CASCADE_FAILED
  | typeof EVENT_CONSENT_VERSION_STALE_DENIAL;

// ---------------------------------------------------------------------------
// Internal: safe insert that never throws to callers.
// Mirrors the swallow-failures contract of `logSecurityEvent` so consent
// audit writes share its safety properties without sharing its type pin.
// ---------------------------------------------------------------------------

function safeWarn(msg: string, fields: Record<string, unknown>): void {
  try {
    log.warn(msg, fields);
  } catch {
    // Intentionally swallowed — audit helper must not fail under any condition.
  }
}

interface InternalInsertInput {
  userId: string;
  eventType: ConsentEventType;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
}

async function insertAuditRow(input: InternalInsertInput): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("audit_logs").insert({
      user_id: input.userId,
      event_type: input.eventType,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      metadata: input.metadata,
      ip_address: null,
      user_agent: null,
    });
    if (error) {
      safeWarn("audit_logs.consent_insert_failed", {
        event_type: input.eventType,
        user_id: input.userId,
        error: error.message,
      });
    }
  } catch (e) {
    safeWarn("audit_logs.consent_insert_threw", {
      event_type: input.eventType,
      user_id: input.userId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// Generic helper
// ---------------------------------------------------------------------------

export interface LogConsentEventInput {
  userId: string;
  eventType: ConsentEventType;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write any one of the four consent events. Thin pass-through to the
 * internal admin insert — exists so call sites import a typed narrow surface
 * that the compiler can pin to the four legal event strings.
 */
export async function logConsentEvent(
  input: LogConsentEventInput,
): Promise<void> {
  await insertAuditRow({
    userId: input.userId,
    eventType: input.eventType,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  });
}

// ---------------------------------------------------------------------------
// recordRevokeCascade — the high-level helper the revoke API route uses
// ---------------------------------------------------------------------------

interface RevokeCascadeSuccess {
  userId: string;
  itemsErased: number;
  tablesTouched: readonly string[];
  durationMs: number;
  error?: undefined;
}

interface RevokeCascadeFailure {
  userId: string;
  itemsErased?: number;
  tablesTouched?: readonly string[];
  durationMs: number;
  error: string;
}

export type RecordRevokeCascadeInput =
  | RevokeCascadeSuccess
  | RevokeCascadeFailure;

/**
 * Stamp the success or failure of a networking-consent revoke cascade.
 *
 *   - On success: writes `networking_revoked` with structured metadata
 *     (`items_erased`, `tables_touched`, `duration_ms`) — this is the proof
 *     row the Trust Console renders to the user.
 *   - On failure: writes `networking_revoke_cascade_failed` with the same
 *     metadata plus an `error` string so support can reconstruct the failure
 *     without replaying the request.
 *
 * The variant is selected on the presence of an `error` field, so the two
 * input shapes are mutually exclusive at the type level — callers cannot
 * accidentally emit a "success" row that carries an error message.
 */
/**
 * Map a raw Postgres / Supabase error string to an opaque error code.
 * Keeps internal schema details (column names, constraint names, RLS hints)
 * out of the durable audit row — operators still get the verbose detail
 * from the matching `log.error` line they fire alongside.
 */
function sanitizeErrorCode(error: string): string {
  if (/permission|denied|rls|policy|forbidden/i.test(error)) {
    return "permission_denied";
  }
  if (/timeout|timed out|deadline/i.test(error)) return "timeout";
  if (/network|connection|econnrefused|enotfound|fetch/i.test(error)) {
    return "network_error";
  }
  if (/constraint|foreign key|unique|check/i.test(error)) {
    return "constraint_violation";
  }
  if (/not found|missing|null/i.test(error)) return "not_found";
  return "cascade_failed";
}

export async function recordRevokeCascade(
  input: RecordRevokeCascadeInput,
): Promise<void> {
  if (input.error === undefined) {
    await logConsentEvent({
      userId: input.userId,
      eventType: EVENT_NETWORKING_REVOKED,
      metadata: {
        items_erased: input.itemsErased,
        tables_touched: Array.from(input.tablesTouched),
        duration_ms: input.durationMs,
      },
    });
    return;
  }

  await logConsentEvent({
    userId: input.userId,
    eventType: EVENT_NETWORKING_REVOKE_CASCADE_FAILED,
    metadata: {
      items_erased: input.itemsErased ?? 0,
      tables_touched: Array.from(input.tablesTouched ?? []),
      duration_ms: input.durationMs,
      error_code: sanitizeErrorCode(input.error),
    },
  });
}
