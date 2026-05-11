"use client";

import { useState, useTransition, type JSX } from "react";
import { trackGoal } from "@/lib/analytics/plausible";

/**
 * Activate-Pass button.
 *
 * The /api/stripe/checkout route is POST + auth-gated. From an unauthenticated
 * marketing surface we can't hit it directly without surfacing a 401 JSON
 * blob, so this button:
 *
 *   1) POSTs to /api/stripe/checkout with { tier: "seasonPass" }
 *   2) On 401, routes the visitor to /lobby?intent=season-pass so they sign
 *      in first and the lobby can replay the intent.
 *   3) On 200, navigates straight to the Stripe Checkout URL.
 *
 * Visual style mirrors the gold CTA used across /season-pass so the button
 * is interchangeable with the static <Link> fallback for tests / SSR.
 */
interface ActivatePassButtonProps {
  label: string;
  testId?: string;
  variant?: "primary" | "footer";
}

const PRIMARY_STYLE = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: "15px",
  fontWeight: 600,
  background: "rgba(201, 168, 76, 0.22)",
  border: "1px solid rgba(201, 168, 76, 0.55)",
  color: "#C9A84C",
  minHeight: "44px",
  padding: "12px 28px",
  borderRadius: "8px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
} as const;

export function ActivatePassButton({
  label,
  testId,
  variant: _variant = "primary",
}: ActivatePassButtonProps): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    // GTM funnel goal — fires at the click, BEFORE the network round-trip.
    // We deliberately track intent rather than success: a checkout that
    // never lands on Stripe is still a strong revenue signal worth
    // measuring against the eventual season_pass_purchased goal.
    trackGoal("season_pass_checkout_start", { surface: "season-pass" });
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tier: "seasonPass" }),
        });

        if (res.status === 401) {
          window.location.assign("/lobby?intent=season-pass");
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          setError(text.length > 0 ? "Couldn't open checkout. Try again." : "Couldn't open checkout. Try again.");
          return;
        }

        const data = (await res.json()) as { url?: string };
        if (typeof data.url === "string" && data.url.length > 0) {
          window.location.assign(data.url);
        } else {
          setError("Checkout didn't return a URL. Email us at hello@interntower.com.");
        }
      } catch {
        setError("Network error. Try again in a moment.");
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="transition-all disabled:opacity-60"
        style={{
          ...PRIMARY_STYLE,
          cursor: isPending ? "wait" : "pointer",
        }}
        data-testid={testId}
        aria-describedby={error ? `${testId ?? "activate-pass"}-error` : undefined}
      >
        {isPending ? "Opening Stripe…" : `${label} →`}
      </button>
      {error !== null && (
        <span
          id={`${testId ?? "activate-pass"}-error`}
          role="alert"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "12px",
            color: "#ef9a9a",
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
