import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

/**
 * Security audit event type union.
 *
 * This list MUST stay in sync with the `audit_logs_event_type_check` CHECK
 * constraint in the migration — the DB enforces the same set.
 */
export type AuditEventType =
  | "oauth_connected" | "oauth_disconnected"
  | "data_exported" | "data_delete_requested" | "data_delete_canceled" | "data_hard_deleted"
  | "agent_side_effect_email_sent" | "agent_side_effect_status_updated"
  | "prompt_injection_detected"
  | "subscription_created" | "subscription_canceled" | "subscription_updated"
  | "login_succeeded" | "login_failed";

export interface AuditEvent {
  userId: string;
  eventType: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/** Best-effort warn that never propagates — used when even logging could fail
 * (e.g. env config missing). Swallows any throw so `logSecurityEvent` stays
 * unconditionally safe. */
function safeWarn(msg: string, fields: Record<string, unknown>): void {
  try {
    log.warn(msg, fields);
  } catch {
    // Intentionally swallowed — audit helper must not fail under any condition.
  }
}

/**
 * Fire-and-forget audit log write. Never throws — audit failures must never
 * take down the primary flow. Failures surface via the application logger.
 *
 * Uses the service-role admin client so writes bypass RLS (the `audit_logs`
 * table intentionally has no INSERT policy — writes are service-role only,
 * reads are gated to `auth.uid() = user_id`).
 */
export async function logSecurityEvent(event: AuditEvent): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("audit_logs").insert({
      user_id: event.userId,
      event_type: event.eventType,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      metadata: event.metadata ?? {},
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
    });
    if (error) {
      safeWarn("audit_logs.insert_failed", {
        event_type: event.eventType, user_id: event.userId, error: error.message,
      });
    }
  } catch (e) {
    safeWarn("audit_logs.insert_threw", {
      event_type: event.eventType, user_id: event.userId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Extract request metadata (IP, User-Agent) for forensic fields. */
export function requestMetadata(request: Request): Pick<AuditEvent, "ipAddress" | "userAgent"> {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;
  return { ipAddress, userAgent };
}
