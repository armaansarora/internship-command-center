import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("./server", () => ({
  // Deterministic fake: return the priceId suffix so tests assert plumbing
  // rather than the real tier-lookup table (exercised by its own tests).
  tierFromPriceId: (priceId: string) =>
    priceId === "price_pro" ? "pro" : priceId === "price_team" ? "team" : "free",
}));

import {
  buildSubscriptionAuditEvent,
  buildPaymentFailureAuditEvent,
  buildRefundAuditEvent,
} from "./webhook-audit";

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

// ── buildPaymentFailureAuditEvent ───────────────────────────────────────────

describe("buildPaymentFailureAuditEvent", () => {
  function makeInvoiceEvent(overrides: Partial<{
    id: string;
    amountDue: number | null;
    currency: string | null;
    attemptCount: number | null;
    nextAttempt: number | null;
    email: string | null;
  }> = {}): Stripe.Event {
    const {
      id = "in_test_xyz",
      amountDue = 2900,
      currency = "usd",
      attemptCount = 1,
      nextAttempt = 1_800_000_000,
      email = "buyer@example.com",
    } = overrides;
    return {
      id: "evt_payment_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          id,
          amount_due: amountDue,
          currency,
          attempt_count: attemptCount,
          next_payment_attempt: nextAttempt,
          customer_email: email,
        },
      },
    } as unknown as Stripe.Event;
  }

  it("maps invoice.payment_failed → payment_failed with financial fields and hashed email", () => {
    const result = buildPaymentFailureAuditEvent(makeInvoiceEvent(), "user-1");
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe("payment_failed");
    expect(result?.resourceType).toBe("stripe_invoice");
    expect(result?.resourceId).toBe("in_test_xyz");
    expect(result?.metadata).toMatchObject({
      amount_due: 2900,
      currency: "usd",
      attempt_count: 1,
      next_payment_attempt: 1_800_000_000,
    });
    expect(result?.metadata?.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    // Defensive PII check: raw email must never appear in metadata.
    expect(JSON.stringify(result?.metadata)).not.toMatch(/buyer@example\.com/);
  });

  it("returns null for non-matching event types", () => {
    const ev = {
      id: "evt_other",
      type: "checkout.session.completed",
      data: { object: {} },
    } as unknown as Stripe.Event;
    expect(buildPaymentFailureAuditEvent(ev, "user-1")).toBeNull();
  });

  it("handles missing email (customer_email_hash becomes null, no throw)", () => {
    const result = buildPaymentFailureAuditEvent(
      makeInvoiceEvent({ email: null }),
      "user-1",
    );
    expect(result?.metadata?.customer_email_hash).toBeNull();
  });

  it("handles missing numeric fields (amount_due / attempt_count / next_payment_attempt become null)", () => {
    const result = buildPaymentFailureAuditEvent(
      makeInvoiceEvent({
        amountDue: null,
        attemptCount: null,
        nextAttempt: null,
      }),
      "user-1",
    );
    expect(result?.metadata).toMatchObject({
      amount_due: null,
      attempt_count: null,
      next_payment_attempt: null,
    });
  });

  it("falls back to expanded invoice.customer.email when customer_email is null", () => {
    const event = {
      id: "evt_payment_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test_xyz",
          amount_due: 2900,
          currency: "usd",
          attempt_count: 1,
          next_payment_attempt: 1_800_000_000,
          customer_email: null,
          customer: { id: "cus_abc", email: "expanded@example.com" },
        },
      },
    } as unknown as Stripe.Event;

    const result = buildPaymentFailureAuditEvent(event, "user-1");
    // Direct field was null; resolver should have pulled from expanded
    // customer object and produced a non-null hash.
    expect(result?.metadata?.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(result?.metadata)).not.toMatch(/expanded@example\.com/);
  });
});

// ── buildRefundAuditEvent ───────────────────────────────────────────────────

describe("buildRefundAuditEvent", () => {
  function makeRefundEvent(overrides: Partial<{
    id: string;
    amountRefunded: number | null;
    currency: string | null;
    paymentIntent: string | null;
    email: string | null;
  }> = {}): Stripe.Event {
    const {
      id = "ch_test_xyz",
      amountRefunded = 14900,
      currency = "usd",
      paymentIntent = "pi_test_xyz",
      email = "buyer@example.com",
    } = overrides;
    return {
      id: "evt_refund",
      type: "charge.refunded",
      data: {
        object: {
          id,
          amount_refunded: amountRefunded,
          currency,
          payment_intent: paymentIntent,
          receipt_email: email,
        },
      },
    } as unknown as Stripe.Event;
  }

  it("maps charge.refunded → refund_issued with financial fields and hashed email", () => {
    const result = buildRefundAuditEvent(makeRefundEvent(), "user-1");
    expect(result?.eventType).toBe("refund_issued");
    expect(result?.resourceType).toBe("stripe_charge");
    expect(result?.resourceId).toBe("ch_test_xyz");
    expect(result?.metadata).toMatchObject({
      amount_refunded: 14900,
      currency: "usd",
      payment_intent: "pi_test_xyz",
    });
    expect(result?.metadata?.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(result?.metadata)).not.toMatch(/buyer@example\.com/);
  });

  it("returns null for non-matching event types", () => {
    const ev = {
      id: "evt_other",
      type: "customer.subscription.updated",
      data: { object: {} },
    } as unknown as Stripe.Event;
    expect(buildRefundAuditEvent(ev, "user-1")).toBeNull();
  });

  it("handles expanded payment_intent object (uses its id, not the whole object)", () => {
    const result = buildRefundAuditEvent(
      {
        id: "evt_refund",
        type: "charge.refunded",
        data: {
          object: {
            id: "ch_test_xyz",
            amount_refunded: 14900,
            currency: "usd",
            payment_intent: { id: "pi_from_object" },
            receipt_email: null,
          },
        },
      } as unknown as Stripe.Event,
      "user-1",
    );
    expect(result?.metadata?.payment_intent).toBe("pi_from_object");
  });

  it("falls back to billing_details.email when receipt_email is null", () => {
    const event = {
      id: "evt_refund",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_xyz",
          amount_refunded: 14900,
          currency: "usd",
          payment_intent: "pi_xyz",
          receipt_email: null,
          billing_details: { email: "billing@example.com" },
        },
      },
    } as unknown as Stripe.Event;

    const result = buildRefundAuditEvent(event, "user-1");
    expect(result?.metadata?.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(result?.metadata)).not.toMatch(/billing@example\.com/);
  });

  it("falls back to expanded charge.customer.email when receipt_email and billing_details are absent", () => {
    const event = {
      id: "evt_refund",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_xyz",
          amount_refunded: 14900,
          currency: "usd",
          payment_intent: "pi_xyz",
          receipt_email: null,
          billing_details: { email: null },
          customer: { id: "cus_abc", email: "fromcustomer@example.com" },
        },
      },
    } as unknown as Stripe.Event;

    const result = buildRefundAuditEvent(event, "user-1");
    expect(result?.metadata?.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(result?.metadata)).not.toMatch(/fromcustomer@example\.com/);
  });
});
