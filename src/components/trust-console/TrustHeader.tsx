import type { JSX } from "react";

/**
 * TrustHeader — the dossier-style heading for the Trust Console page.
 *
 * Aesthetic: trust-as-craftsmanship. The page sits behind a single
 * Playfair Display title and a one-line ethos in Satoshi muted body. No
 * decorative chrome — restraint is the message. A small inline link to
 * the public privacy policy lets readers cross-reference the legal text
 * if they want the long form.
 *
 * Pure presentational: no props, no client state. Renders identically on
 * server + client. The page route at /settings/privacy composes this
 * with the data-bearing siblings.
 */
export function TrustHeader(): JSX.Element {
  return (
    <header
      className="mb-8 md:mb-12"
      aria-labelledby="trust-console-title"
      data-testid="trust-header"
    >
      <h1
        id="trust-console-title"
        className="font-display text-3xl md:text-4xl font-bold leading-tight"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#F4ECD8",
          letterSpacing: "-0.01em",
        }}
      >
        Your Trust Console
      </h1>
      <p
        className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed"
        style={{
          fontFamily: "'Satoshi', system-ui, sans-serif",
          color: "rgba(244, 236, 216, 0.72)",
        }}
      >
        What we know, what we use it for, how to take it back. All at the
        front.
      </p>
      <p
        className="mt-4 text-xs md:text-sm"
        style={{
          fontFamily: "'Satoshi', system-ui, sans-serif",
          color: "rgba(244, 236, 216, 0.56)",
        }}
      >
        For the full legal text, read the{" "}
        <a
          href="/privacy"
          className="underline underline-offset-2 transition-colors hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 rounded-sm"
          style={{ color: "#C9A84C" }}
          data-testid="trust-header-privacy-link"
        >
          public privacy policy
        </a>
        .
      </p>
    </header>
  );
}
