"use client";

import type { JSX } from "react";
import { useState, useTransition } from "react";

interface Props {
  initialConsentAt: string | null;
  initialRevokedAt: string | null;
  onOptIn: () => Promise<void>;
  onRevoke: () => Promise<void>;
}

/*
 * Warm Intro Network consent surface.
 *
 * IMPORTANT: the consent copy below is load-bearing — it's what users
 * legally agreed to. Do NOT edit without bumping
 * user_profiles.networking_consent_version. Past consent is invalidated
 * when the version changes; users will be required to re-consent.
 *
 * P9 grep invariant checks specific canary sentences appear here.
 */

const COPY = {
  heading: "Opt in to the Warm Intro Network",
  body:
    "The Warm Intro Network connects you — by name and target company only — " +
    "with other Tower users who have opted in. Example: you're targeting " +
    "Blackstone; another user has a contact there. If you both opt in, The " +
    "Tower can suggest an introduction to each of you.",
  shareHeading: "What we share between opted-in users:",
  shareList: [
    "Your full name (as shown on your profile).",
    "The companies on your active applications.",
    "Your email address, only when you accept a specific intro.",
  ],
  neverHeading: "What we never share:",
  neverList: [
    "Your contacts, your messages, your cover letters, your interview notes, your private sticky-notes.",
    "Anyone else's data with you unless they've also opted in.",
  ],
  revokeNote:
    "You can revoke at any time. Revoking is instant. Within 60 seconds, " +
    "your name and applications are removed from the match index. Past " +
    "intros already accepted remain.",
  rateLimitNote:
    "Match queries are rate-limited to 20 per hour to prevent scraping.",
  auditNote:
    "Every match surfaced to you is logged in Settings → Networking under " +
    "“How your data is used”.",
  checkboxLabel:
    "I have read the above and opt in to the Warm Intro Network.",
  optInButton: "Opt In",
  revokeButton: "Revoke",
};

export function NetworkingConsent({
  initialConsentAt,
  initialRevokedAt,
  onOptIn,
  onRevoke,
}: Props): JSX.Element {
  const [consentAt, setConsentAt] = useState<string | null>(initialConsentAt);
  const [revokedAt, setRevokedAt] = useState<string | null>(initialRevokedAt);
  const [agreed, setAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isActive =
    consentAt !== null &&
    (revokedAt === null || new Date(revokedAt) < new Date(consentAt));

  const handleOptIn = () => {
    if (!agreed) return;
    startTransition(async () => {
      await onOptIn();
      setConsentAt(new Date().toISOString());
      setRevokedAt(null);
      setAgreed(false);
    });
  };

  const handleRevoke = () => {
    startTransition(async () => {
      await onRevoke();
      setRevokedAt(new Date().toISOString());
    });
  };

  return (
    <section
      aria-labelledby="networking-consent-heading"
      className="networking-consent"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        color: "#FDF3E8",
        padding: "20px 24px",
        border: "1px solid rgba(201, 168, 76, 0.25)",
        borderRadius: 4,
        background: "rgba(46, 26, 10, 0.3)",
        maxWidth: 640,
      }}
    >
      <h2
        id="networking-consent-heading"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22,
          color: "#C9A84C",
          margin: 0,
        }}
      >
        {COPY.heading}
      </h2>

      <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 14 }}>
        {COPY.body}
      </p>

      <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#C4925A", marginTop: 20, marginBottom: 6 }}>
        {COPY.shareHeading}
      </h3>
      <ul style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.6 }}>
        {COPY.shareList.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#C4925A", marginTop: 18, marginBottom: 6 }}>
        {COPY.neverHeading}
      </h3>
      <ul style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.6 }}>
        {COPY.neverList.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          marginTop: 18,
          padding: "10px 12px",
          background: "rgba(201, 168, 76, 0.08)",
          border: "1px solid rgba(201, 168, 76, 0.2)",
          borderRadius: 3,
        }}
      >
        <strong>{COPY.revokeNote}</strong>
      </p>

      <p
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          marginTop: 10,
          color: "#C4925A",
        }}
      >
        {COPY.rateLimitNote}
      </p>

      <p
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          marginTop: 6,
          color: "#C4925A",
        }}
      >
        {COPY.auditNote}
      </p>

      {isActive ? (
        <div style={{ marginTop: 20 }}>
          <p aria-live="polite" style={{ fontSize: 13, color: "#E8C87A" }}>
            You opted in on {consentAt ? new Date(consentAt).toLocaleDateString() : ""}.
            Your name and target companies are in the Warm Intro Network.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRevoke}
            aria-label="Revoke Warm Intro Network consent"
            style={buttonStyle({ variant: "revoke", disabled: isPending })}
          >
            {isPending ? "Revoking…" : COPY.revokeButton}
          </button>
        </div>
      ) : revokedAt ? (
        <div style={{ marginTop: 20 }}>
          <p aria-live="polite" style={{ fontSize: 13, color: "#C4925A" }}>
            You revoked on {new Date(revokedAt).toLocaleDateString()}. Your
            name and applications are no longer in the Warm Intro Network.
            You can opt in again at any time.
          </p>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              marginTop: 10,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
            />
            {COPY.checkboxLabel}
          </label>
          <button
            type="button"
            disabled={isPending || !agreed}
            onClick={handleOptIn}
            aria-label="Opt in to Warm Intro Network"
            style={buttonStyle({ variant: "optIn", disabled: isPending || !agreed })}
          >
            {isPending ? "Opting in…" : COPY.optInButton}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
            />
            {COPY.checkboxLabel}
          </label>
          <button
            type="button"
            disabled={isPending || !agreed}
            onClick={handleOptIn}
            aria-label="Opt in to Warm Intro Network"
            style={buttonStyle({ variant: "optIn", disabled: isPending || !agreed })}
          >
            {isPending ? "Opting in…" : COPY.optInButton}
          </button>
        </div>
      )}
    </section>
  );
}

function buttonStyle({
  variant,
  disabled,
}: {
  variant: "optIn" | "revoke";
  disabled: boolean;
}): React.CSSProperties {
  const base: React.CSSProperties = {
    marginTop: 12,
    padding: "8px 18px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    borderRadius: 2,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
  if (variant === "optIn") {
    return {
      ...base,
      background: "rgba(201, 168, 76, 0.14)",
      color: "#C9A84C",
      border: "1px solid rgba(201, 168, 76, 0.4)",
    };
  }
  return {
    ...base,
    background: "rgba(110, 126, 143, 0.1)",
    color: "#BFC4C9",
    border: "1px solid rgba(136, 146, 160, 0.3)",
  };
}
