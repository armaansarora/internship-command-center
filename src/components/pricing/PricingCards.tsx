"use client";

import { useState, useCallback, type JSX } from "react";
import { STRIPE_PLANS, type SubscriptionTier } from "@/lib/stripe/config";

interface PricingCardsProps {
  currentTier: SubscriptionTier;
  appsUsed: number;
}

const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    "Up to 10 applications",
    "War Room + Penthouse floors",
    "Basic analytics",
    "30 req/min rate limit",
  ],
  pro: [
    "Unlimited applications",
    "All 7 floors unlocked",
    "All 8 AI agents",
    "Daily briefing",
    "Full analytics",
    "100 req/min rate limit",
  ],
  team: [
    "Everything in Pro",
    "Team analytics dashboard",
    "Priority support",
    "200 req/min rate limit",
  ],
};

export function PricingCards({ currentTier, appsUsed }: PricingCardsProps): JSX.Element {
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = useCallback(
    async (tier: SubscriptionTier) => {
      if (tier === currentTier) return;
      setLoading(tier);

      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: STRIPE_PLANS[tier].priceId }),
        });

        if (!response.ok) {
          setLoading(null);
          return;
        }

        const data = (await response.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
        } else {
          setLoading(null);
        }
      } catch {
        setLoading(null);
      }
    },
    [currentTier],
  );

  const tierOrder: SubscriptionTier[] = ["free", "pro", "team"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {tierOrder.map((tier) => {
        const plan = STRIPE_PLANS[tier];
        const isCurrentPlan = tier === currentTier;
        const features = PLAN_FEATURES[tier];
        const isLoadingThis = loading === tier;

        const getButtonLabel = () => {
          if (isCurrentPlan) return "Current Plan";
          if (tier === "free") return "Downgrade";
          return `Upgrade to ${plan.name}`;
        };

        return (
          <div
            key={tier}
            className="relative rounded-xl p-5 flex flex-col gap-4 transition-transform duration-200"
            style={{
              background: isCurrentPlan
                ? "rgba(201, 168, 76, 0.06)"
                : "rgba(10, 12, 25, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: isCurrentPlan
                ? "1px solid rgba(201, 168, 76, 0.45)"
                : "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: isCurrentPlan
                ? "0 0 32px rgba(201, 168, 76, 0.08), 0 4px 24px rgba(0, 0, 0, 0.3)"
                : "0 4px 24px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Current plan badge */}
            {isCurrentPlan && (
              <div
                className="absolute top-3 right-3 rounded-full px-2.5 py-0.5"
                style={{
                  background: "rgba(201, 168, 76, 0.15)",
                  border: "1px solid rgba(201, 168, 76, 0.3)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    color: "#C9A84C",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Current
                </span>
              </div>
            )}

            {/* Plan name */}
            <div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: isCurrentPlan ? "#C9A84C" : "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {plan.name}
              </h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "28px",
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
                      fontSize: "13px",
                      color: "var(--text-muted)",
                    }}
                  >
                    / month
                  </span>
                )}
              </div>
            </div>

            {/* Features list */}
            <ul className="flex flex-col gap-2 flex-1">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  >
                    <path
                      d="M2.5 7L5.5 10L11.5 4"
                      stroke={isCurrentPlan ? "#C9A84C" : "rgba(255,255,255,0.4)"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: "13px",
                      color: "var(--text-secondary, rgba(255,255,255,0.7))",
                      lineHeight: 1.4,
                    }}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* App usage indicator for free tier */}
            {tier === "free" && (
              <div className="mt-1">
                <div className="flex items-center justify-between mb-1">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Applications
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: appsUsed >= 10 ? "#ef4444" : "var(--text-muted)",
                    }}
                  >
                    {appsUsed} / 10
                  </span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (appsUsed / 10) * 100)}%`,
                      background:
                        appsUsed >= 10
                          ? "#ef4444"
                          : appsUsed >= 8
                          ? "#f59e0b"
                          : "#C9A84C",
                    }}
                  />
                </div>
              </div>
            )}

            {/* CTA button */}
            <button
              type="button"
              disabled={isCurrentPlan || isLoadingThis}
              onClick={() => void handleUpgrade(tier)}
              className="w-full rounded-lg py-2.5 px-4 transition-all duration-150 mt-auto"
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.02em",
                cursor: isCurrentPlan ? "default" : "pointer",
                background: isCurrentPlan
                  ? "rgba(201, 168, 76, 0.08)"
                  : tier === "free"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(201, 168, 76, 0.15)",
                border: isCurrentPlan
                  ? "1px solid rgba(201, 168, 76, 0.2)"
                  : tier === "free"
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(201, 168, 76, 0.3)",
                color: isCurrentPlan
                  ? "rgba(201, 168, 76, 0.5)"
                  : tier === "free"
                  ? "rgba(255,255,255,0.5)"
                  : "#C9A84C",
                opacity: isCurrentPlan ? 0.8 : 1,
              }}
              aria-label={
                isCurrentPlan
                  ? `${plan.name} is your current plan`
                  : `Switch to ${plan.name} plan`
              }
            >
              {isLoadingThis ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="14 14"
                    />
                  </svg>
                  Loading...
                </span>
              ) : (
                getButtonLabel()
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
