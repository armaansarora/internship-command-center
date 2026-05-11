import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { LEGAL_CONFIG } from "@/lib/config/legal-config";
import { PRICING_CONFIG } from "@/lib/config/pricing-config";
import {
  getSeasonPassTier,
  seasonPassScopeLine,
  seasonPassRange,
} from "@/lib/pricing/season-pass";

const BRAND_URL = GATE_CONFIG.brand.url();

export const metadata: Metadata = {
  title: "Pricing — The Tower",
  description:
    "One Season Pass covers the full internship recruiting season. Or pick Pro monthly. Free tier is real.",
  alternates: { canonical: `${BRAND_URL}/pricing` },
  openGraph: {
    title: "The Tower — Season Pass, Pro, and Free",
    description:
      "Pay once for the recruiting season, or month-by-month with Pro. Campus career-center pilots available.",
    url: `${BRAND_URL}/pricing`,
    type: "website",
  },
};

interface PricingPageProps {
  searchParams: Promise<{ billing?: string }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const annualToggleAvailable = PRICING_CONFIG.annualDiscountPct > 0;
  const isAnnual = annualToggleAvailable && params.billing === "annual";
  const seasonPassOn = GATE_CONFIG.flags.seasonPassEnabled();
  const seasonPass: ReturnType<typeof getSeasonPassTier> | null = seasonPassOn
    ? getSeasonPassTier()
    : null;
  const proConfig = PRICING_CONFIG.tiers.pro;
  const freeConfig = PRICING_CONFIG.tiers.free;
  const betaGated = GATE_CONFIG.beta.mode !== "open";

  if (!PRICING_CONFIG.flags.pricingPublic) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "32px",
            color: "var(--text-primary)",
          }}
        >
          Pricing announced soon.
        </p>
        <Link
          href="/waitlist"
          className="mt-6 inline-block rounded-lg px-6 py-3 transition-all"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontWeight: 600,
            background: "rgba(201, 168, 76, 0.15)",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            color: "#C9A84C",
          }}
        >
          Join the waitlist
        </Link>
      </div>
    );
  }

  // Schema.org Product structured data for the Season Pass — surfaces price
  // and availability to crawlers when the flag is on.
  const seasonPassSchema =
    seasonPass !== null
      ? {
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
        }
      : null;

  return (
    <div className="mx-auto max-w-6xl py-12 md:py-16">
      {seasonPassSchema !== null && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seasonPassSchema) }}
        />
      )}

      <header className="mb-10 text-center">
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(40px, 6vw, 56px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          Pricing
        </h1>
        <p
          className="mx-auto mt-4 max-w-xl"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "16px",
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.5,
          }}
        >
          Free is real, not a five-day trial. {LEGAL_CONFIG.refund.headline}
        </p>
      </header>

      {annualToggleAvailable && <BillingToggle isAnnual={isAnnual} />}

      {/* Campus lane sits ABOVE the consumer tiers — it's the institutional
          path and shouldn't compete with the individual cards visually. */}
      <CampusBanner />

      {/* Tier cards. When Season Pass is on, three cards: Free, Season Pass
          (centered, prominent), Pro. When off, two cards: Free, Pro. */}
      <div
        className={
          seasonPass !== null
            ? "mt-8 grid grid-cols-1 gap-6 md:grid-cols-3"
            : "mt-8 grid grid-cols-1 gap-6 md:grid-cols-2"
        }
        data-testid="pricing-tiers"
      >
        <FreeCard freePrice={freeConfig.price} betaGated={betaGated} />

        {seasonPass !== null && (
          <SeasonPassCard
            price={seasonPass.price}
            yearlyPrice={seasonPass.yearlyPrice}
            name={seasonPass.name}
            betaGated={betaGated}
          />
        )}

        <ProCard
          price={proConfig.price}
          yearlyPrice={proConfig.yearlyPrice}
          isAnnual={isAnnual}
          annualToggleAvailable={annualToggleAvailable}
          betaGated={betaGated}
        />
      </div>

      <div className="mt-16 text-center">
        <p
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {LEGAL_CONFIG.refund.body}
        </p>
        <p
          className="mt-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.1em",
          }}
        >
          Questions? {LEGAL_CONFIG.entity.supportEmail}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────── Tier cards ─────────────────────── */

interface FreeCardProps {
  freePrice: number;
  betaGated: boolean;
}

function FreeCard({ freePrice, betaGated }: FreeCardProps) {
  const ctaHref = betaGated ? "/waitlist" : "/lobby";
  const ctaLabel = betaGated ? "Request key" : "Start free";

  return (
    <div
      className="relative flex flex-col gap-5 rounded-2xl border p-6"
      style={{
        background: "rgba(10, 12, 25, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
      }}
      data-tier="free"
    >
      <div>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Free
        </h3>
        <p
          className="mt-1"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          See if the building&apos;s for you.
        </p>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "44px",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {freePrice === 0 ? "Free" : `$${freePrice}`}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {[
          `Up to ${PRICING_CONFIG.freeAppCap} active applications`,
          `${PRICING_CONFIG.freeAiCallsPerDay} AI agent runs per day`,
          "War Room + Penthouse access",
          "Basic analytics",
        ].map((feature) => (
          <FeatureBullet key={feature} feature={feature} highlight={false} />
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="block rounded-lg px-4 py-3 text-center transition-all"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "14px",
          fontWeight: 600,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.85)",
          minHeight: "44px",
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

interface SeasonPassCardProps {
  price: number;
  yearlyPrice: number;
  name: string;
  betaGated: boolean;
}

function SeasonPassCard({
  price,
  yearlyPrice: _yearlyPrice,
  name,
  betaGated,
}: SeasonPassCardProps) {
  const ctaHref = betaGated ? "/waitlist" : "/season-pass";
  const ctaLabel = betaGated ? "Request key" : "Activate the pass";

  // Tailwind's hover:ring colour is driven by --tw-ring-color; we set it
  // here so the focus ring stays on-brand without leaking a JIT class.
  const seasonPassStyle: CSSProperties & { ["--tw-ring-color"]?: string } = {
    background:
      "linear-gradient(180deg, rgba(201, 168, 76, 0.10) 0%, rgba(201, 168, 76, 0.04) 100%)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderColor: "rgba(201, 168, 76, 0.55)",
    boxShadow:
      "0 0 50px rgba(201, 168, 76, 0.12), 0 8px 32px rgba(0,0,0,0.35)",
    "--tw-ring-color": "rgba(201, 168, 76, 0.45)",
  };

  return (
    <div
      className="relative flex flex-col gap-5 rounded-2xl border-2 p-7 transition-all hover:ring-2"
      style={seasonPassStyle}
      data-tier="season-pass"
      data-testid="season-pass-card"
    >
      {/* "Most popular" pin — anchored above the card, gold. */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1"
        style={{
          background: "rgba(201, 168, 76, 0.22)",
          border: "1px solid rgba(201, 168, 76, 0.55)",
        }}
        data-testid="season-pass-pin"
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            color: "#C9A84C",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Most popular
        </span>
      </div>

      <div>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#C9A84C",
            lineHeight: 1.2,
          }}
        >
          {name}
        </h3>
        <p
          className="mt-1"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Your recruiting season, paid once.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1">
          <span
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "48px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            ${price}
          </span>
          <span
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            one-time
          </span>
        </div>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(201, 168, 76, 0.9)",
            letterSpacing: "0.06em",
          }}
        >
          {seasonPassScopeLine()}
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {[
          "Unlimited applications all season",
          "All eight AI agents on call",
          "CEO morning briefing every day",
          "Negotiation Parlor when an offer lands",
          "Warm-intro graph if you opt in",
          "Full analytics, rejection autopsy",
        ].map((feature) => (
          <FeatureBullet key={feature} feature={feature} highlight />
        ))}
      </ul>

      <Link
        href={ctaHref}
        className="block rounded-lg px-4 py-3 text-center transition-all"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "15px",
          fontWeight: 600,
          background: "rgba(201, 168, 76, 0.22)",
          border: "1px solid rgba(201, 168, 76, 0.55)",
          color: "#C9A84C",
          minHeight: "44px",
        }}
        data-testid="season-pass-cta"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

interface ProCardProps {
  price: number;
  yearlyPrice: number;
  isAnnual: boolean;
  annualToggleAvailable: boolean;
  betaGated: boolean;
}

function ProCard({
  price,
  yearlyPrice,
  isAnnual,
  annualToggleAvailable,
  betaGated,
}: ProCardProps) {
  const ctaHref = betaGated ? "/waitlist" : "/lobby";
  const ctaLabel = betaGated ? "Request key" : "Upgrade to Pro";
  const showAnnualPrice = isAnnual && price > 0;
  const monthlyEquivalent = showAnnualPrice
    ? Math.round((yearlyPrice / 12) * 100) / 100
    : null;
  const annualSavings = showAnnualPrice ? price * 12 - yearlyPrice : 0;

  return (
    <div
      className="relative flex flex-col gap-5 rounded-2xl border p-6"
      style={{
        background: "rgba(10, 12, 25, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
      }}
      data-tier="pro"
    >
      <div>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Pro
        </h3>
        <p
          className="mt-1"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Flexibility for off-season usage.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1">
          <span
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "44px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {showAnnualPrice && monthlyEquivalent !== null
              ? `$${monthlyEquivalent}`
              : `$${price}`}
          </span>
          <span
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            / month
          </span>
        </div>
        {showAnnualPrice && (
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "rgba(201, 168, 76, 0.85)",
              letterSpacing: "0.06em",
            }}
          >
            ${yearlyPrice}/year — save ${annualSavings}
          </p>
        )}
        {!showAnnualPrice && annualToggleAvailable && (
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.06em",
            }}
          >
            or ${yearlyPrice}/year
          </p>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {[
          "Month-to-month, cancel anytime",
          "Unlimited applications",
          "Every specialist floor unlocked",
          "All eight AI agents",
          "Cross-user warm-intro matching",
          "Full analytics",
        ].map((feature) => (
          <FeatureBullet key={feature} feature={feature} highlight={false} />
        ))}
      </ul>

      <Link
        href={ctaHref}
        className="block rounded-lg px-4 py-3 text-center transition-all"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "14px",
          fontWeight: 600,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.9)",
          minHeight: "44px",
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

/* ─────────────────────── Campus banner ─────────────────────── */

function CampusBanner() {
  return (
    <aside
      className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border p-6 md:flex-row md:items-center md:gap-6 md:p-7"
      style={{
        background:
          "linear-gradient(90deg, rgba(10, 12, 25, 0.6) 0%, rgba(201, 168, 76, 0.05) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "rgba(255,255,255,0.10)",
      }}
      data-testid="campus-banner"
      aria-label="Campus career center pilots"
    >
      <div className="flex flex-col gap-1">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "rgba(201, 168, 76, 0.8)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          For institutions
        </span>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "22px",
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Hiring a class? Get a campus pilot.
        </h3>
        <p
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.5,
          }}
        >
          Counselor visibility, outcome reporting, cohort matching for career
          centers.
        </p>
      </div>
      <Link
        href="/campus"
        className="shrink-0 rounded-lg px-5 py-3 transition-all"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "14px",
          fontWeight: 600,
          background: "rgba(201, 168, 76, 0.12)",
          border: "1px solid rgba(201, 168, 76, 0.35)",
          color: "#C9A84C",
          minHeight: "44px",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        Talk to us →
      </Link>
    </aside>
  );
}

/* ─────────────────────── Shared ─────────────────────── */

function FeatureBullet({
  feature,
  highlight,
}: {
  feature: string;
  highlight: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className="mt-1 shrink-0"
      >
        <path
          d="M2.5 7L5.5 10L11.5 4"
          stroke={highlight ? "#C9A84C" : "rgba(255,255,255,0.5)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "14px",
          color: "rgba(255,255,255,0.78)",
          lineHeight: 1.5,
        }}
      >
        {feature}
      </span>
    </li>
  );
}

function BillingToggle({ isAnnual }: { isAnnual: boolean }) {
  void seasonPassRange; // keep symbol live across tree shaking
  return (
    <div
      role="tablist"
      aria-label="Billing period"
      className="mx-auto flex w-fit items-center gap-1 rounded-full p-1"
      style={{
        background: "rgba(10, 12, 25, 0.6)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Link
        role="tab"
        aria-selected={!isAnnual}
        href="/pricing"
        scroll={false}
        className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-1.5 transition-all"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          background: !isAnnual ? "rgba(201, 168, 76, 0.18)" : "transparent",
          color: !isAnnual ? "#C9A84C" : "rgba(255,255,255,0.55)",
          border: !isAnnual ? "1px solid rgba(201, 168, 76, 0.3)" : "1px solid transparent",
        }}
      >
        Monthly
      </Link>
      <Link
        role="tab"
        aria-selected={isAnnual}
        href="/pricing?billing=annual"
        scroll={false}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-1.5 transition-all"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          background: isAnnual ? "rgba(201, 168, 76, 0.18)" : "transparent",
          color: isAnnual ? "#C9A84C" : "rgba(255,255,255,0.55)",
          border: isAnnual ? "1px solid rgba(201, 168, 76, 0.3)" : "1px solid transparent",
        }}
      >
        Annual
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            color: "#C9A84C",
            background: "rgba(201, 168, 76, 0.15)",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            borderRadius: "999px",
            padding: "1px 6px",
          }}
        >
          −{PRICING_CONFIG.annualDiscountPct}%
        </span>
      </Link>
    </div>
  );
}
