import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("./server", () => ({
  // Deterministic fake: return the priceId suffix so tests assert plumbing
  // rather than the real tier-lookup table (exercised by its own tests).
  tierFromPriceId: (priceId: string) =>
    priceId === "price_pro" ? "pro" : priceId === "price_team" ? "team" : "free",
}));

import { buildSubscriptionAuditEvent } from "./webhook-audit";

// Minimal shape that satisfies the helper — we only read
// `id`, `status`, `items.data[0].price.id`, `items.data[0].current_period_end`.
// Casting to `Stripe.Subscription` keeps the helper's public signature honest
// without having to build the full 200-field object.
function makeSubscription(overrides: {
  id?: string;
  status?: string;
  priceId?: string | null;
  currentPeriodEnd?: number | null;
} = {}): Stripe.Subscription {
  const {
    id = "sub_test_123",
    status = "active",
    priceId = "price_pro",
    currentPeriodEnd = 1_800_000_000,
  } = overrides;

  return {
    id,
    status,
    items: {
      data: priceId
        ? [
            {
              current_period_end: currentPeriodEnd ?? undefined,
              price: { id: priceId },
            },
          ]
        : [],
    },
  } as unknown as Stripe.Subscription;
}

function makeEvent(
  type: string,
  subscription: Stripe.Subscription,
): Stripe.Event {
  return {
    id: `evt_${type}`,
    type,
    data: { object: subscription },
  } as unknown as Stripe.Event;
}

describe("buildSubscriptionAuditEvent", () => {
  it("maps customer.subscription.created → subscription_created", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent("customer.subscription.created", makeSubscription()),
      "user-1",
    );
    expect(result).toEqual({
      userId: "user-1",
      eventType: "subscription_created",
      resourceType: "stripe_subscription",
      resourceId: "sub_test_123",
      metadata: {
        status: "active",
        tier: "pro",
        current_period_end: 1_800_000_000,
      },
    });
  });

  it("maps customer.subscription.updated → subscription_updated", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent(
        "customer.subscription.updated",
        makeSubscription({ priceId: "price_team", status: "trialing" }),
      ),
      "user-2",
    );
    expect(result?.eventType).toBe("subscription_updated");
    expect(result?.metadata).toMatchObject({ status: "trialing", tier: "team" });
  });

  it("maps customer.subscription.deleted → subscription_canceled", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent(
        "customer.subscription.deleted",
        makeSubscription({ status: "canceled" }),
      ),
      "user-3",
    );
    expect(result?.eventType).toBe("subscription_canceled");
    expect(result?.resourceType).toBe("stripe_subscription");
    expect(result?.metadata).toMatchObject({ status: "canceled" });
  });

  it("returns null for non-subscription events", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent("checkout.session.completed", makeSubscription()),
      "user-1",
    );
    expect(result).toBeNull();
  });

  it("handles missing priceId (tier becomes null, no throw)", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent(
        "customer.subscription.updated",
        makeSubscription({ priceId: null }),
      ),
      "user-1",
    );
    expect(result?.metadata).toMatchObject({ tier: null, current_period_end: null });
  });

  it("handles missing current_period_end (becomes null, no throw)", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent(
        "customer.subscription.updated",
        makeSubscription({ currentPeriodEnd: null }),
      ),
      "user-1",
    );
    expect(result?.metadata?.current_period_end).toBeNull();
  });

  it("records the subscription id as resourceId", () => {
    const result = buildSubscriptionAuditEvent(
      makeEvent(
        "customer.subscription.created",
        makeSubscription({ id: "sub_custom_999" }),
      ),
      "user-1",
    );
    expect(result?.resourceId).toBe("sub_custom_999");
  });
});
