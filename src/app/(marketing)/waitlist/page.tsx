import type { Metadata } from "next";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { LEGAL_CONFIG } from "@/lib/config/legal-config";
import { WaitlistForm } from "./WaitlistForm";

const BRAND_URL = GATE_CONFIG.brand.url();

export const metadata: Metadata = {
  title: "Join the Waitlist — The Tower",
  description: `${GATE_CONFIG.brand.tagline} Built for the night before the deadline — when you have three tabs open and one closed for Citadel.`,
  alternates: { canonical: `${BRAND_URL}/waitlist` },
  openGraph: {
    title: `${GATE_CONFIG.brand.name} — Internship Command Center`,
    description: `${GATE_CONFIG.brand.tagline} Built for the night before the deadline.`,
    url: `${BRAND_URL}/waitlist`,
    type: "website",
  },
};

/**
 * Top-of-funnel copy points. Anchored to Maya's actual late-night pain (three
 * tabs open, just lost Citadel, applying to three more before bed). Each
 * bullet is one concrete observable behavior, never an abstract feature
 * promise.
 *
 * These don't read as features — they read as memory. That's the goal: the
 * visitor recognizes the situation before they read the brand.
 */
const PAIN_POINTS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Three tabs, one closed.",
    body: "Citadel rejected your application at 9:47pm. You're applying to Jane Street, Two Sigma, and Citadel-again-but-different-team before midnight. The spreadsheet you started in September has 31 rows and 14 colors. None of them work anymore.",
  },
  {
    title: "Your cover letters all sound the same.",
    body: "You wrote the first one. The next eleven are derivatives of derivatives. The recruiter sees \"passionate about quantitative finance\" four times in a single day. So do you.",
  },
  {
    title: "Networking is a Notion graveyard.",
    body: "Sixteen LinkedIn DMs in drafts. Three half-finished follow-ups from the career fair in October. A coffee chat next Thursday you forgot to confirm. The names are all real. The system isn't.",
  },
  {
    title: "Interviews come in clumps.",
    body: "Four superdays in the same week. Each one needs a different prep doc, a different question list, a different mental model. You make it through. You forget what you said. You blow the fifth.",
  },
];

/**
 * Trust signals. Each one is verifiable from the codebase / docs — no vapor.
 * Order matters: privacy first (the highest-friction concern for someone
 * about to type their email), payment terms second, founder-mode last.
 */
const TRUST_SIGNALS: ReadonlyArray<{ heading: string; body: string }> = [
  {
    heading: "We email you once.",
    body: "When your key is ready. No drip, no marketing, no resold list. Unsubscribe is one click — we don't make you ask.",
  },
  {
    heading: "Your data, exportable.",
    body: `Settings → Data → Export gives you every row, every doc, every contact. ${LEGAL_CONFIG.entity.legalEntity} retains nothing after deletion. Email ${LEGAL_CONFIG.entity.supportEmail} and we move fast.`,
  },
  {
    heading: "Founder-operated.",
    body: "Built by a CS undergrad who lost Citadel at 2am one October. The product exists because the spreadsheet didn't.",
  },
];

export default function WaitlistPage() {
  return (
    <div className="mx-auto max-w-5xl py-12 md:py-20">
      {/* Hero — the moment of recognition. Big serif, narrow column, no
          stock-photo. The headline names the room the visitor is sitting in. */}
      <header className="mx-auto max-w-3xl text-center">
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(201, 168, 76, 0.7)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Now boarding the freshman through senior class
        </p>
        <h1
          className="mt-3"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Step into the lobby.
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "17px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.6,
          }}
        >
          {GATE_CONFIG.brand.tagline} We&apos;re letting people in slowly so the
          building stays well-staffed. Drop your email and we&apos;ll send a key
          when a floor opens.
        </p>

        <div className="mx-auto mt-10 w-full max-w-md">
          <WaitlistForm />
        </div>

        <p
          className="mt-6"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.1em",
          }}
        >
          We email you once. No drip, no marketing, no resold lists.
        </p>
      </header>

      {/* Pain points — four observable behaviors, no benefits language.
          Each card describes a 9:47pm-on-a-Sunday scene the visitor either
          recognizes or doesn't. If they recognize even one, the brand has
          earned the right to keep talking. */}
      <section
        aria-labelledby="recognized-pain"
        className="mt-24"
      >
        <h2
          id="recognized-pain"
          className="mb-10 text-center"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(28px, 4vw, 40px)",
            color: "var(--text-primary)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
          }}
        >
          You know this room.
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PAIN_POINTS.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 rounded-xl border p-6"
              style={{
                background: "rgba(10, 12, 25, 0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "22px",
                  color: "#C9A84C",
                  lineHeight: 1.2,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.6,
                }}
              >
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Trust signals — the visitor has read this far. Now give them the
          three things that matter at the email-entry inflection: privacy,
          data ownership, founder accountability. */}
      <section
        aria-labelledby="trust-signals"
        className="mt-20"
      >
        <h2
          id="trust-signals"
          className="mb-8 text-center"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(24px, 3vw, 32px)",
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Before you type your email.
        </h2>
        <ul className="mx-auto grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
          {TRUST_SIGNALS.map((item) => (
            <li
              key={item.heading}
              className="flex flex-col gap-2 rounded-xl border p-5"
              style={{
                background: "rgba(10, 12, 25, 0.45)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <h3
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "#C9A84C",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {item.heading}
              </h3>
              <p
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.55,
                }}
              >
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
