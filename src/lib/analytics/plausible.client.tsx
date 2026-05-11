import type { JSX } from "react";
import Script from "next/script";
import { GATE_CONFIG } from "@/lib/config/gate-config";

/**
 * Plausible <Script> wrapper.
 *
 * Renders the tagged-events Plausible script only when both:
 *   1. `gateConfig.flags.plausibleEnabled()` returns true (which reads
 *      `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` on every call).
 *   2. `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is non-empty.
 *
 * Returns `null` from SSR when the flag is off so the rendered markup
 * contains no Plausible reference at all — the founder can flip the env
 * var to silence analytics across both client and server in a single move.
 *
 * Loads `script.tagged-events.js` (instead of plain `script.js`) so the
 * named conversion goals — `waitlist_submit`, `activate_complete`,
 * `season_pass_checkout_start`, `season_pass_purchased` — can be fired
 * either imperatively via `trackGoal()` OR declaratively via
 * `class="plausible-event-name=<goal>"` on any element.
 */
export function PlausibleScript(): JSX.Element | null {
  if (!GATE_CONFIG.flags.plausibleEnabled()) return null;

  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ??
    "https://plausible.io/js/script.tagged-events.js";

  return (
    <Script
      defer
      data-domain={domain}
      src={src}
      strategy="afterInteractive"
    />
  );
}
