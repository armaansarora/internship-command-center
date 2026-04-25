import type { Metadata } from "next";
import Link from "next/link";
import { LAUNCH_CONFIG } from "@/lib/launch-config";
import { STRIPE_PLANS, type SubscriptionTier } from "@/lib/stripe/config";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${LAUNCH_CONFIG.brand.name} subscription tiers.`,
  alternates: { canonical: `${LAUNCH_CONFIG.brand.url()}/pricing` },
};

interface TierCard {
  tier: SubscriptionTier;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

const TIER_COPY: Record<SubscriptionTier, Omit<TierCard, "tier">> = {
  free: {
    tagline: "See if the building's for you.",
    features: [
      `Up to ${LAUNCH_CONFIG.pricing.freeAppCap} active applications`,
      `${LAUNCH_CONFIG.pricing.freeAiCallsPerDay} AI agent runs per day`,
      "War Room + Penthouse access",
      "Basic analytics",
    ],
    cta: "Start free",
    highlight: false,
  },
  pro: {
    tagline: "The full tower, every floor.",
    features: [
      "Unlimited applications",
      "All seven floors unlocked",
      "All eight AI agents",
      "Daily briefing + outreach drafts",
      "Negotiation Parlor + Observatory",
      "Cross-user warm-intro matching",
      "Full analytics, rejection autopsy",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  team: {
    tagline: "For when one search isn't enough.",
    features: [
      "Everything in Pro",
      "Shared War Room across teammates",
      "Priority support",
      "Higher rate limits",
    ],
    cta: "Talk to us",
    highlight: false,
  },
};

const TIER_ORDER: SubscriptionTier[] = ["free", "pro", "team"];

export default function PricingPage() {
  if (!LAUNCH_CONFIG.flags.pricingPublic) {
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

  return (
    <div className="mx-auto max-w-6xl py-12 md:py-16">
      <header className="mb-12 text-center">
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
          Free is real, not a five-day trial. {LAUNCH_CONFIG.pricing.refundHeadline}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const plan = STRIPE_PLANS[tier];
          const copy = TIER_COPY[tier];
          const isHighlighted = copy.highlight;

          return (
            <div
              key={tier}
              className="relative flex flex-col gap-5 rounded-2xl p-6"
              style={{
                background: isHighlighted
                  ? "rgba(201, 168, 76, 0.06)"
                  : "rgba(10, 12, 25, 0.6)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: isHighlighted
                  ? "1px solid rgba(201, 168, 76, 0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isHighlighted
                  ? "0 0 40px rgba(201, 168, 76, 0.08), 0 8px 32px rgba(0,0,0,0.3)"
                  : "0 4px 24px rgba(0,0,0,0.25)",
              }}
            >
              {isHighlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1"
                  style={{
                    background: "rgba(201, 168, 76, 0.2)",
                    border: "1px solid rgba(201, 168, 76, 0.5)",
                  }}
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
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: isHighlighted ? "#C9A84C" : "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  {copy.tagline}
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
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span
                    style={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    / month
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {copy.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
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
                        stroke={isHighlighted ? "#C9A84C" : "rgba(255,255,255,0.5)"}
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
                ))}
              </ul>

              <Link
                href="/lobby"
                className="block rounded-lg px-4 py-3 text-center transition-all"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: isHighlighted
                    ? "rgba(201, 168, 76, 0.18)"
                    : "rgba(255,255,255,0.05)",
                  border: isHighlighted
                    ? "1px solid rgba(201, 168, 76, 0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: isHighlighted ? "#C9A84C" : "rgba(255,255,255,0.85)",
                }}
              >
                {copy.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <p
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {LAUNCH_CONFIG.pricing.refundBody}
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
          Questions? {LAUNCH_CONFIG.brand.supportEmail}
        </p>
      </div>
    </div>
  );
}
