import { log } from "@/lib/logger";

/**
 * Server-side engagement events (Fix #3).
 *
 * Writes a single row to `engagement_events` via the service-role client.
 * Fire-and-forget. Never throws. Kill-switched by env var.
 *
 * What this module owns end-to-end:
 *   - Event-type union and route-kind mapping. Middleware emits three kinds
 *     (marketing_view, floor_view, auth_gate_blocked); server actions emit
 *     activation_step. The classifier here never produces activation_step —
 *     those are written directly from the /activate server actions.
 *   - Middleware request classifier — decides whether the request even
 *     produces an event, before any DB call.
 *   - Pathname / metadata sanitization. Query strings, hashes, and any
 *     non-allowlisted metadata keys are dropped here, not by the caller.
 *   - Best-effort insert with logged-but-swallowed failures.
 *
 * Privacy: we DO read user-agent for bot detection but never store it.
 * No IP, no headers, no query string, no body.
 *
 * Kill-switch: when `TOWER_SERVER_ANALYTICS_ENABLED !== "1"` the helper is
 * a no-op. The service-role admin module is loaded via dynamic import so it
 * never enters the middleware bundle when the kill-switch is off.
 */

// ---------------------------------------------------------------------------
// Public type surface
// ---------------------------------------------------------------------------

export type EngagementEventType =
  | "marketing_view"
  | "floor_view"
  | "auth_gate_blocked"
  | "activation_step";

export type EngagementRouteKind =
  | "marketing"
  | "floor"
  | "gate"
  | "activation";

export type EngagementMetadataValue = string | number | boolean;
export type EngagementMetadata = Record<string, EngagementMetadataValue>;

export interface RecordInput {
  eventType: EngagementEventType;
  /** Pre-stripped: nextUrl.pathname only. No search, no hash. */
  pathname: string;
  userId: string | null;
  /** First segment of pathname; used for `floor_view`. */
  floor?: string | null;
  /** Allowlisted keys only; other keys are silently dropped. */
  metadata?: EngagementMetadata;
}

export interface ClassifyInput {
  /** Already-stripped pathname (e.g. `request.nextUrl.pathname`). */
  pathname: string;
  /** HTTP method — only GET is classifiable. */
  method: string;
  /** User-agent header value (used for bot detection only, never stored). */
  userAgent: string | null;
  /** `Next-Router-Prefetch` header — Next.js link prefetch. */
  prefetch: string | null;
  /** `RSC` header — React Server Component payload request. */
  rsc: string | null;
  /** `Sec-Fetch-Dest` header — top-level docs only. */
  secFetchDest: string | null;
  /** True iff middleware has a verified user object for this request. */
  isAuthenticated: boolean;
}

export interface ClassifiedRequest {
  eventType: EngagementEventType;
  routeKind: EngagementRouteKind;
  pathname: string;
  floor: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_METADATA_KEYS = new Set<string>([
  "is_authenticated",
  "tier",
  "is_first_floor_visit",
  // activation_step keys (PR1 — 5-minute activation gauntlet)
  "step_id",
  "outcome",
  "dwell_ms",
  "source",
  "beat",
]);

const MAX_PATHNAME_LENGTH = 256;
const MAX_FLOOR_LENGTH = 32;

const MARKETING_PATHS = new Set<string>([
  "/",
  "/pricing",
  "/waitlist",
  "/terms",
  "/privacy",
  "/lobby",
]);

const FLOOR_FIRST_SEGMENTS = new Set<string>([
  "penthouse",
  "c-suite",
  "war-room",
  "writing-room",
  "briefing-room",
  "situation-room",
  "rolodex-lounge",
  "observatory",
  "parlor",
  "milestones",
  "settings",
  "lobby",
]);

const BOT_USER_AGENT_RE = /bot|crawler|spider|crawling|monitor|preview/i;

const IGNORE_PREFIXES = ["/api/", "/_next/", "/sentry-tunnel"] as const;
const IGNORE_EXACT = new Set<string>(["/api", "/sentry-tunnel"]);

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

function routeKindFor(eventType: EngagementEventType): EngagementRouteKind {
  if (eventType === "floor_view") return "floor";
  if (eventType === "auth_gate_blocked") return "gate";
  if (eventType === "activation_step") return "activation";
  return "marketing";
}

function sanitizeMetadata(input: EngagementMetadata): EngagementMetadata {
  const out: EngagementMetadata = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string") {
      out[key] = value.length > 64 ? value.slice(0, 64) : value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

/** Strip trailing slash unless the pathname is "/". */
function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/** First non-empty segment of pathname, capped at MAX_FLOOR_LENGTH. */
export function floorSegment(pathname: string): string | null {
  const normalized = normalizePath(pathname);
  if (!normalized || normalized === "/") return null;
  const idx = normalized.indexOf("/", 1);
  const seg = idx === -1 ? normalized.slice(1) : normalized.slice(1, idx);
  if (!seg || seg.length === 0 || seg.length > MAX_FLOOR_LENGTH) return null;
  return seg;
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Decide whether a middleware-intercepted request deserves an engagement
 * event, and if so which kind. Pure function: no I/O, no env reads, no
 * promises. Safe to call on every middleware request.
 *
 * Returns `null` for: non-GET, prefetch, RSC, sub-document fetch, bot UA,
 * API/static/sentry paths, and any path that isn't in the marketing or
 * floor lists.
 */
export function classifyMiddlewareRequest(
  input: ClassifyInput,
): ClassifiedRequest | null {
  const { method, userAgent, prefetch, rsc, secFetchDest } = input;

  if (method.toUpperCase() !== "GET") return null;

  if (prefetch === "1") return null;
  if (rsc === "1") return null;

  if (
    secFetchDest !== null &&
    secFetchDest !== "" &&
    secFetchDest !== "document"
  ) {
    return null;
  }

  if (userAgent != null && BOT_USER_AGENT_RE.test(userAgent)) return null;

  const rawPath = input.pathname;
  if (!rawPath) return null;

  if (IGNORE_EXACT.has(rawPath)) return null;
  for (const prefix of IGNORE_PREFIXES) {
    if (rawPath.startsWith(prefix)) return null;
  }

  const pathname = normalizePath(rawPath);
  const firstSegment = pathname.split("/")[1] ?? "";

  // Lobby root is dual: marketing when unauthed, floor when authed.
  if (pathname === "/lobby") {
    if (!input.isAuthenticated) {
      return {
        eventType: "marketing_view",
        routeKind: "marketing",
        pathname,
        floor: null,
      };
    }
    return {
      eventType: "floor_view",
      routeKind: "floor",
      pathname,
      floor: "lobby",
    };
  }

  if (FLOOR_FIRST_SEGMENTS.has(firstSegment)) {
    if (input.isAuthenticated) {
      return {
        eventType: "floor_view",
        routeKind: "floor",
        pathname,
        floor: firstSegment.slice(0, MAX_FLOOR_LENGTH),
      };
    }
    return {
      eventType: "auth_gate_blocked",
      routeKind: "gate",
      pathname,
      floor: null,
    };
  }

  if (MARKETING_PATHS.has(pathname)) {
    return {
      eventType: "marketing_view",
      routeKind: "marketing",
      pathname,
      floor: null,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget engagement event writer.
 *
 * - Kill-switch off → returns immediately. The service-role admin module
 *   is never even dynamically imported.
 * - On error or throw → resolves silently, logs via `log.warn`. Never
 *   bubbles to the caller (so middleware response is never affected).
 *
 * Caller should still wrap with `void recordServerEngagementEvent(...).catch(() => {})`
 * to keep the floating-promise lint rule quiet.
 */
export async function recordServerEngagementEvent(
  input: RecordInput,
): Promise<void> {
  if (process.env.TOWER_SERVER_ANALYTICS_ENABLED !== "1") return;

  try {
    // Dynamic import: defers the service-role client module until the
    // first event actually fires, so disabled deployments never load it.
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = getSupabaseAdmin();

    const { error } = await admin.from("engagement_events").insert({
      event_type: input.eventType,
      user_id: input.userId,
      pathname: input.pathname.slice(0, MAX_PATHNAME_LENGTH),
      route_kind: routeKindFor(input.eventType),
      floor: input.floor ?? null,
      metadata: sanitizeMetadata(input.metadata ?? {}),
    });

    if (error) {
      log.warn("engagement.write_failed", {
        eventType: input.eventType,
        error: error.message,
      });
    }
  } catch (e) {
    log.warn("engagement.write_threw", {
      eventType: input.eventType,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
