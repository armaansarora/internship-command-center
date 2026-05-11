import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { LEGAL_CONFIG } from "@/lib/config/legal-config";
import { PRICING_CONFIG } from "@/lib/config/pricing-config";
import {
  getSeasonPassTier,
  seasonPassRange,
  seasonPassScopeLine,
  SEASON_START_DATE,
  SEASON_END_DATE,
  SEASON_WINDOW_LABEL,
} from "@/lib/pricing/season-pass";
import { WaitlistForm } from "../waitlist/WaitlistForm";
import { ActivatePassButton } from "./activate-pass-button";

const BRAND_URL = GATE_CONFIG.brand.url();

export const metadata: Metadata = {
  title: "Season Pass — The Tower",
  description: `Pay once for the entire ${SEASON_WINDOW_LABEL} internship recruiting season. ${SEASON_START_DATE} → ${SEASON_END_DATE}.`,
  alternates: { canonical: `${BRAND_URL}/season-pass` },
  openGraph: {
    title: "The Internship Season Pass",
    description: `One payment covers the full recruiting season — ${SEASON_START_DATE} through ${SEASON_END_DATE}.`,
    url: `${BRAND_URL}/season-pass`,
    type: "website",
  },
};

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Can I get a refund?",
    a: `${LEGAL_CONFIG.refund.body} The Season Pass is a one-time purchase rather than a recurring subscription, so there's nothing to cancel — but the same rule applies: we do not refund partial seasons. Email ${LEGAL_CONFIG.entity.supportEmail} within seven days of purchase if something feels off and we'll make it right.`,
  },
  {
    q: `What happens after ${SEASON_END_DATE}?`,
    a: `Your pass automatically deactivates at the end of the season. We do not auto-renew, auto-charge, or upgrade you. You keep read-only access to your data — your applications, notes, contacts, and offers stay readable so you can export anything you need.`,
  },
  {
    q: "Can I buy a pass for multiple seasons?",
    a: `Each pass covers one season (${seasonPassRange()}). When the next season opens we'll email you a fresh purchase link. We never bundle multi-season pricing up-front — the goal is that you re-decide each year whether the building earned your trust.`,
  },
  {
    q: "How is this different from Pro?",
    a: "Pro is monthly. It exists for the off-season — for instance, if you only need The Tower during a focused two-month sprint, Pro is the right knob. The Season Pass is engineered for full-cycle recruiting: it's cheaper than ten months of Pro and it removes the monthly cancel-decision noise during your most cognitively-loaded stretch.",
  },
  {
    q: "What happens to my data after the season ends?",
    a: `Your data stays in The Tower in read-only mode for at least ${LEGAL_CONFIG.retention.softDeleteDays} days after the season closes. You can export everything from Settings → Data anytime. If you re-activate next season, the data lights back up exactly as you left it.`,
  },
  {
    q: "Can I add Pro on top of the Season Pass?",
    a: "There's no need. The Season Pass already unlocks every floor and every agent for the full season window. If your search extends past the season window (rare, but it happens), Pro is the natural continuation — same data, same workspace, just billed monthly.",
  },
];

export default function SeasonPassPage() {
  const seasonPassOn = GATE_CONFIG.flags.seasonPassEnabled();

  // When the gate is off, we fall back to a "coming soon" surface that
  // still captures emails through the existing waitlist mechanism so we
  // don't bleed inbound interest while the SKU is being staged.
  if (!seasonPassOn) {
    return <ComingSoonSurface />;
  }

  const seasonPass = getSeasonPassTier();

  const seasonPassSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${GATE_CONFIG.brand.name} Internship Season Pass`,
    description: seasonPassScopeLine(),
    brand: { "@type": "Brand", name: GATE_CONFIG.brand.name },
    offers: {
      "@type": "Offer",
      price: seasonPass.price,
      priceCurrency: "USD",
      url: `${BRAND_URL}/season-pass`,
      availability: "https://schema.org/InStock",
      category: "OneTimePurchase",
    },
  };

  return (
    <article className="mx-auto max-w-5xl py-10 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seasonPassSchema) }}
      />

      <Hero price={seasonPass.price} />

      <section className="mt-20" aria-labelledby="whats-included">
        <SectionHeading id="whats-included">What&apos;s included.</SectionHeading>
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {INCLUDED.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 rounded-xl border p-5"
              style={{
                background: "rgba(10, 12, 25, 0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "20px",
                  color: "#C9A84C",
                  lineHeight: 1.2,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.55,
                }}
              >
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20" aria-labelledby="why-season">
        <SectionHeading id="why-season">Why a season, not a subscription.</SectionHeading>
        <div className="mt-6 max-w-3xl">
          <p
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "17px",
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.7,
            }}
          >
            Internship recruiting is seasonal. The rhythm is real: fall
            applications, winter case prep, spring offers, an April decision.
            Subscriptions ask you to keep deciding &mdash; every month, alongside
            classes and interviews, you re-litigate whether to keep paying.
            That decision-cost compounds at exactly the moment you can least
            afford it.
          </p>
          <p
            className="mt-4"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "17px",
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.7,
            }}
          >
            The Season Pass is the season-ticket version. One payment, one
            window, every floor unlocked. Walk in once, stay until the offer
            deadline. We&rsquo;d rather you forget we exist and find your data
            ready in March than think about us monthly.
          </p>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="faq">
        <SectionHeading id="faq">Frequently asked.</SectionHeading>
        <dl className="mt-8 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border p-5 transition-all"
              style={{
                background: "rgba(10, 12, 25, 0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between gap-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "18px",
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                <span>{item.q}</span>
                <span
                  className="shrink-0 transition-transform group-open:rotate-45"
                  aria-hidden="true"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "18px",
                    color: "#C9A84C",
                  }}
                >
                  +
                </span>
              </summary>
              <p
                className="mt-3"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.65,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </dl>
      </section>

      <FooterCta price={seasonPass.price} />
    </article>
  );
}

/* ─────────────────────── Hero ─────────────────────── */

interface HeroProps {
  price: number;
}

function Hero({ price }: HeroProps) {
  const betaGated = GATE_CONFIG.beta.mode !== "open";

  const heroStyle: CSSProperties = {
    background:
      "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201, 168, 76, 0.10) 0%, transparent 70%)",
  };

  return (
    <header
      className="relative flex flex-col items-center gap-6 rounded-3xl px-6 py-14 text-center md:px-12 md:py-20"
      style={heroStyle}
    >
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(201, 168, 76, 0.85)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        Internship Season {SEASON_WINDOW_LABEL}
      </p>
      <h1
        className="max-w-3xl"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(40px, 7vw, 72px)",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.04,
          letterSpacing: "-0.02em",
        }}
      >
        Your recruiting season, paid once.
      </h1>
      <p
        className="max-w-2xl"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "18px",
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.55,
        }}
      >
        {seasonPassScopeLine()} Every floor unlocked. Every agent on call. No
        monthly decision. Walk in when applications open and stay until the
        offer deadline.
      </p>

      <div
        className="mt-4 flex items-baseline gap-2"
        data-testid="season-pass-hero-price"
      >
        <span
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "64px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          ${price}
        </span>
        <span
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "16px",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          one-time
        </span>
      </div>

      <div className="mt-2">
        {betaGated ? (
          <Link
            href="/waitlist"
            className="inline-flex min-h-12 items-center justify-center rounded-lg px-7 py-3 transition-all"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              background: "rgba(201, 168, 76, 0.22)",
              border: "1px solid rgba(201, 168, 76, 0.55)",
              color: "#C9A84C",
            }}
            data-testid="season-pass-primary-cta"
          >
            Request a key →
          </Link>
        ) : (
          <ActivatePassButton
            label="Activate the pass"
            testId="season-pass-primary-cta"
            variant="primary"
          />
        )}
      </div>
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.12em",
        }}
      >
        {LEGAL_CONFIG.refund.headline.replace(/\.$/, "")} — no auto-renewal.
      </p>
    </header>
  );
}

/* ─────────────────────── Footer CTA ─────────────────────── */

function FooterCta({ price }: { price: number }) {
  const betaGated = GATE_CONFIG.beta.mode !== "open";

  return (
    <section
      className="mt-20 rounded-3xl border p-10 text-center md:p-14"
      style={{
        background:
          "linear-gradient(180deg, rgba(201, 168, 76, 0.08) 0%, rgba(10, 12, 25, 0.4) 100%)",
        borderColor: "rgba(201, 168, 76, 0.3)",
      }}
      aria-labelledby="footer-cta-heading"
    >
      <h2
        id="footer-cta-heading"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(28px, 4vw, 40px)",
          color: "var(--text-primary)",
          lineHeight: 1.15,
        }}
      >
        One purchase. One season.
      </h2>
      <p
        className="mx-auto mt-4 max-w-xl"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "16px",
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.55,
        }}
      >
        ${price} for the entire {SEASON_WINDOW_LABEL} recruiting cycle.
      </p>
      <div className="mt-6">
        {betaGated ? (
          <Link
            href="/waitlist"
            className="inline-flex min-h-12 items-center justify-center rounded-lg px-7 py-3 transition-all"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              background: "rgba(201, 168, 76, 0.22)",
              border: "1px solid rgba(201, 168, 76, 0.55)",
              color: "#C9A84C",
            }}
            data-testid="season-pass-footer-cta"
          >
            Request a key →
          </Link>
        ) : (
          <ActivatePassButton
            label="Activate the pass"
            testId="season-pass-footer-cta"
            variant="footer"
          />
        )}
      </div>
      <p
        className="mt-6"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.14em",
        }}
      >
        Questions? {LEGAL_CONFIG.entity.supportEmail}
      </p>
    </section>
  );
}

/* ─────────────────────── Coming soon (flag off / tier absent) ─────────────────────── */

function ComingSoonSurface() {
  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center py-12 text-center md:py-20"
      data-testid="season-pass-coming-soon"
    >
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(201, 168, 76, 0.7)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        Coming soon
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
        The Season Pass opens soon.
      </h1>
      <p
        className="mt-5 max-w-lg"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "17px",
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.55,
        }}
      >
        One purchase. The entire {SEASON_WINDOW_LABEL} recruiting season.
        Drop your email and we&apos;ll send the activation link the moment
        we open the doors.
      </p>

      <div className="mt-10 w-full max-w-md">
        <WaitlistForm />
      </div>

      <p
        className="mt-10 max-w-md"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
        }}
      >
        We email you once. No drip campaigns, no marketing, no resold lists.
      </p>

      <Link
        href="/pricing"
        className="mt-8 inline-flex min-h-11 items-center text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        Or see Free + Pro pricing →
      </Link>

      <p className="sr-only">
        Free tier remains available with up to {PRICING_CONFIG.freeAppCap}{" "}
        applications and {PRICING_CONFIG.freeAiCallsPerDay} AI runs per day.
      </p>
    </div>
  );
}

/* ─────────────────────── Helpers ─────────────────────── */

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-center md:text-left"
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(28px, 4vw, 40px)",
        color: "var(--text-primary)",
        lineHeight: 1.15,
        letterSpacing: "-0.015em",
      }}
    >
      {children}
    </h2>
  );
}

const INCLUDED: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "CEO morning briefing",
    body: "Every morning the CEO greets you with priorities — applications closing today, follow-ups overdue, who to network with, what to write before noon.",
  },
  {
    title: "All eight character agents",
    body: "CRO for pipeline, CMO for cover letters, CNO/CIO for warm intros, COO for follow-ups, CPO for interview prep, CFO for analytics, CEO orchestrating.",
  },
  {
    title: "Unlimited applications",
    body: "No cap on companies, applications, contacts, or interviews. The Free-tier 10-app ceiling lifts the moment your pass activates.",
  },
  {
    title: "Negotiation Parlor",
    body: "When an offer lands, the Parlor opens. Comp benchmarks, counter-offer scripts, leverage math — all walked through by the CEO and CFO together.",
  },
  {
    title: "Warm-intro graph (opt-in)",
    body: "Cross-user intro matching: when another Tower user has a relevant contact at a company you're targeting, we surface the path. Opt-in only, fully revocable.",
  },
  {
    title: "Full analytics, rejection autopsy",
    body: "Every floor's reporting unlocks: pipeline conversion, interview win rates, application-to-offer math, and the rejection autopsy when a No lands.",
  },
];
