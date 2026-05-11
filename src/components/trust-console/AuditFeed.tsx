"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";

/**
 * AuditFeed — chronological list of consent/privacy events recorded for
 * the current user.
 *
 * Each row renders a human-readable title (mapped from event_type), a
 * relative time, and an expandable JSON viewer for the metadata. Unknown
 * event types render the raw type in JetBrains Mono so the user can read
 * them, copy them, and ask support about them.
 *
 * Pure presentational. The page route fetches events and pours them in.
 * `limit` controls the initial page size; "Load more" reveals the rest
 * in chunks of `limit`.
 */

export interface AuditFeedEvent {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditFeedProps {
  events: AuditFeedEvent[];
  limit?: number;
}

const DEFAULT_LIMIT = 20;

/**
 * Format the body of a known event title, given the row.
 *
 * The map is canonical for the Trust Console — every consent / privacy
 * event the audit pipeline emits should have an entry here so the user
 * never sees a raw `event_type` string. Unknown types fall through to the
 * raw mode (renders in JetBrains Mono so the user can grep / quote it).
 *
 * Special-case handling:
 *   - `networking_revoked` appends the items-erased count when present
 *     (so the user sees how thorough the cascade was).
 *   - `data_exported` reads metadata.stage to differentiate
 *     queued / delivered / failed.
 */
function titleFor(ev: AuditFeedEvent): {
  text: string;
  raw: boolean;
} {
  switch (ev.eventType) {
    case "networking_opted_in":
      return { text: "You opted in to warm-intro matching", raw: false };
    case "networking_revoked": {
      const items = (ev.metadata as { items_erased?: number } | null)
        ?.items_erased;
      const base = "You revoked warm-intro matching";
      if (typeof items === "number") {
        return {
          text: `${base} · ${items} item${items === 1 ? "" : "s"} erased`,
          raw: false,
        };
      }
      return { text: base, raw: false };
    }
    case "networking_revoke_cascade_failed":
      return {
        text: "Revocation incomplete — operator notified",
        raw: false,
      };
    case "consent_version_stale_denial":
      return {
        text: "Action denied: consent version out of date",
        raw: false,
      };
    case "oauth_granted":
    case "oauth_connected":
      return {
        text: `OAuth grant: ${ev.resourceType ?? "unknown"}`,
        raw: false,
      };
    case "oauth_disconnected":
      return {
        text: `OAuth disconnect: ${ev.resourceType ?? "unknown"}`,
        raw: false,
      };
    case "data_exported": {
      const stage = (ev.metadata as { stage?: string } | null)?.stage;
      if (stage === "delivered") return { text: "Data export delivered", raw: false };
      if (stage === "failed") return { text: "Data export failed", raw: false };
      return { text: "Data export queued", raw: false };
    }
    case "data_export_requested":
      return { text: "Data export requested", raw: false };
    case "data_delete_requested":
      return { text: "Account deletion requested", raw: false };
    case "data_delete_canceled":
      return { text: "Account deletion canceled", raw: false };
    case "data_hard_deleted":
      return { text: "Account hard-deleted", raw: false };
    case "agent_side_effect_email_sent":
      return { text: "An AI agent sent an email on your behalf", raw: false };
    case "agent_side_effect_status_updated":
      return {
        text: "An AI agent updated an application status on your behalf",
        raw: false,
      };
    case "prompt_injection_detected":
      return { text: "A prompt-injection attempt was blocked", raw: false };
    case "subscription_created":
      return { text: "Subscription started", raw: false };
    case "subscription_canceled":
      return { text: "Subscription canceled", raw: false };
    case "subscription_updated":
      return { text: "Subscription updated", raw: false };
    case "login_succeeded":
      return { text: "Signed in", raw: false };
    case "login_failed":
      return { text: "Failed sign-in attempt", raw: false };
    default:
      return { text: ev.eventType, raw: true };
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const now = Date.now();
  const deltaSec = Math.floor((now - then) / 1000);
  if (deltaSec < 0) return "just now";
  if (deltaSec < 60) return "just now";
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? "" : "s"} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year === 1 ? "" : "s"} ago`;
}

function fullDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

function metadataIsEmpty(m: Record<string, unknown>): boolean {
  return Object.keys(m).length === 0;
}

function jsonStringifySafe(v: Record<string, unknown>): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "[unserializable metadata]";
  }
}

export function AuditFeed(props: AuditFeedProps): JSX.Element {
  const { events } = props;
  const limit = props.limit ?? DEFAULT_LIMIT;

  const [visibleCount, setVisibleCount] = useState<number>(limit);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visible = useMemo(
    () => events.slice(0, visibleCount),
    [events, visibleCount],
  );
  const hasMore = events.length > visibleCount;

  const toggle = (id: string): void => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadMore = (): void => {
    setVisibleCount((c) => c + limit);
  };

  if (events.length === 0) {
    return (
      <section
        aria-labelledby="audit-feed-title"
        data-testid="audit-feed"
        className="rounded-xl p-5 md:p-6"
        style={{
          background: "rgba(20, 22, 38, 0.72)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <h2
          id="audit-feed-title"
          className="mb-3 text-lg md:text-xl font-semibold"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#F4ECD8",
          }}
        >
          Audit history
        </h2>
        <p
          data-testid="audit-feed-empty"
          className="text-sm leading-relaxed"
          style={{
            fontFamily: "'Satoshi', system-ui, sans-serif",
            color: "rgba(244, 236, 216, 0.62)",
          }}
        >
          Nothing here yet. Every consent change will land here.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="audit-feed-title"
      data-testid="audit-feed"
      className="rounded-xl p-5 md:p-6"
      style={{
        background: "rgba(20, 22, 38, 0.72)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <h2
        id="audit-feed-title"
        className="mb-4 text-lg md:text-xl font-semibold"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#F4ECD8",
        }}
      >
        Audit history
      </h2>

      <ol
        className="flex flex-col divide-y"
        style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
        data-testid="audit-feed-list"
      >
        {visible.map((ev) => {
          const t = titleFor(ev);
          const isOpen = expanded[ev.id] === true;
          const hasMeta = !metadataIsEmpty(ev.metadata);
          return (
            <li
              key={ev.id}
              className="py-3 first:pt-0 last:pb-0"
              data-testid="audit-row"
              data-event-type={ev.eventType}
              style={{
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span
                  className="text-sm md:text-base"
                  style={{
                    fontFamily: t.raw
                      ? "'JetBrains Mono', monospace"
                      : "'Satoshi', system-ui, sans-serif",
                    color: "#F4ECD8",
                  }}
                >
                  {t.text}
                </span>
                <time
                  dateTime={ev.createdAt}
                  title={fullDateTime(ev.createdAt)}
                  className="shrink-0 text-xs"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(244, 236, 216, 0.55)",
                  }}
                >
                  {relativeTime(ev.createdAt)}
                </time>
              </div>
              {hasMeta && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => toggle(ev.id)}
                    aria-expanded={isOpen}
                    aria-controls={`audit-meta-${ev.id}`}
                    data-testid="audit-row-expand"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
                    style={{
                      fontFamily: "'Satoshi', system-ui, sans-serif",
                      color: "rgba(201, 168, 76, 0.95)",
                      background: "rgba(201, 168, 76, 0.06)",
                      border: "1px solid rgba(201, 168, 76, 0.20)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        transform: isOpen
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                        transition: "transform 120ms ease-out",
                      }}
                    >
                      ›
                    </span>
                    {isOpen ? "Hide metadata" : "Show metadata"}
                  </button>
                  {isOpen && (
                    <pre
                      id={`audit-meta-${ev.id}`}
                      data-testid="audit-row-meta"
                      className="mt-2 overflow-x-auto rounded-md p-3 text-xs leading-relaxed"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "rgba(244, 236, 216, 0.82)",
                        background: "rgba(0, 0, 0, 0.32)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      {jsonStringifySafe(ev.metadata)}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            data-testid="audit-feed-load-more"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
            style={{
              fontFamily: "'Satoshi', system-ui, sans-serif",
              background: "rgba(201, 168, 76, 0.08)",
              color: "#C9A84C",
              border: "1px solid rgba(201, 168, 76, 0.32)",
            }}
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
