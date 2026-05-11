"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type JSX,
} from "react";
import { joinWaitlist } from "./actions";
import { trackGoal, trackPlausibleEvent } from "@/lib/analytics/plausible";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

// Recognized referral channels. The same tokens are accepted by the
// retention beacon (`?ref=…` in middleware) so attribution stays consistent
// across the funnel. Unknown values are sanitized to "direct" by the server
// action's Zod parser (utm field caps at 256 chars; anything longer is
// rejected before persistence).
const KNOWN_REF_SOURCES = new Set([
  "reddit",
  "campus",
  "twitter",
  "linkedin",
  "hn",
  "referral",
  "direct",
]);

/**
 * Read `?ref=…` from the current URL on mount. The component never re-reads
 * across rerenders (a SPA navigation back to /waitlist doesn't change the
 * source). Unknown values fall through to "direct" — fail-closed so a hostile
 * caller can't smuggle arbitrary text into the warehouse.
 */
function readReferralSource(): string {
  if (typeof window === "undefined") return "direct";
  const raw = new URLSearchParams(window.location.search).get("ref");
  if (!raw) return "direct";
  const trimmed = raw.trim().toLowerCase();
  return KNOWN_REF_SOURCES.has(trimmed) ? trimmed : "direct";
}

export function WaitlistForm(): JSX.Element {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [refSource, setRefSource] = useState<string>("direct");

  // SSR hydration handoff: read `?ref=` exactly once on mount. The empty
  // server-rendered string is replaced with the real source on the client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR hydration handoff
    setRefSource(readReferralSource());
  }, []);

  // Pre-compute the document.referrer once — accessing it on every render
  // would tear hydration if the value changed mid-flight (it can't, but the
  // memo also avoids re-reading the DOM on every keystroke).
  const referrer = useMemo<string>(() => {
    if (typeof document === "undefined") return "";
    return document.referrer;
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.kind === "submitting" || isPending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ kind: "submitting" });
    trackPlausibleEvent("tower_waitlist_submit_started", {
      source: refSource,
    });
    startTransition(async () => {
      const result = await joinWaitlist(data);
      if (result.ok) {
        setStatus({ kind: "success" });
        trackPlausibleEvent("tower_waitlist_submit_succeeded", {
          source: refSource,
        });
        // GTM funnel goal — separate from the granular tower_* event so the
        // founder's conversion dashboard reads waitlist_submit as ONE entry
        // rather than parsing a multi-state event. Fires after the server
        // action acks, so a 4xx/5xx never registers as a conversion.
        trackGoal("waitlist_submit", { source: refSource });
        form.reset();
      } else {
        setStatus({ kind: "error", message: result.error });
        trackPlausibleEvent("tower_waitlist_submit_failed", {
          source: refSource,
          reason: result.error,
        });
      }
    });
  };

  if (status.kind === "success") {
    return (
      <div
        className="rounded-xl px-6 py-8 text-center"
        role="status"
        aria-live="polite"
        style={{
          background: "rgba(201, 168, 76, 0.08)",
          border: "1px solid rgba(201, 168, 76, 0.3)",
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "22px",
            color: "#C9A84C",
            lineHeight: 1.3,
          }}
        >
          You&apos;re on the list.
        </p>
        <p
          className="mt-2"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.5,
          }}
        >
          When the doorman calls your name, we&apos;ll send the key.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="referrer" value={referrer} />
      {/* The `utm` column carries the resolved referral source — the same
          enum the retention beacon reads from `?ref=` in middleware. The
          server-side Zod schema caps this at 256 chars and the client-side
          allowlist constrains the values, so this hidden field can't be
          weaponized to insert arbitrary text. */}
      <input type="hidden" name="utm" value={refSource} />
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-invalid={status.kind === "error"}
          aria-describedby={status.kind === "error" ? "waitlist-error" : undefined}
          placeholder="you@example.com"
          className="flex-1 rounded-lg px-4 py-3 outline-none transition-all"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "15px",
            background: "rgba(10, 12, 25, 0.7)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--text-primary)",
            minHeight: "44px",
          }}
        />
        <button
          type="submit"
          disabled={status.kind === "submitting" || isPending}
          className="rounded-lg px-6 py-3 transition-all disabled:opacity-60"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            background: "rgba(201, 168, 76, 0.18)",
            border: "1px solid rgba(201, 168, 76, 0.4)",
            color: "#C9A84C",
            cursor: status.kind === "submitting" || isPending ? "wait" : "pointer",
            minHeight: "44px",
          }}
        >
          {status.kind === "submitting" || isPending ? "Adding…" : "Request key"}
        </button>
      </div>
      {status.kind === "error" && (
        <p
          id="waitlist-error"
          role="alert"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "13px",
            color: "#ef9a9a",
          }}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
