import type Stripe from "stripe";
import { tierFromPriceId } from "./server";
import type { AuditEvent } from "@/lib/audit/log";

/**
 * Map a Stripe subscription-lifecycle event to an {@link AuditEvent} payload.
 *
 * Pure function — no I/O. The webhook handler calls this to build the
 * argument for `logSecurityEvent` after it has already resolved the Tower
 * user id from the Stripe customer. Extracted so the mapping can be tested
 * without mocking the full webhook stack.
 *
 * Returns `null` for event types outside the subscription lifecycle.
 */
export function buildSubscriptionAuditEvent(
  event: Stripe.Event,
  userId: string,
): AuditEvent | null {
  const eventType = subscriptionAuditEventType(event.type);
  if (!eventType) return null;

  const subscription = event.data.object as Stripe.Subscription;
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id;

  // In Stripe API 2026-02-25.clover the period window lives on each item.
  // We capture the first item's window — all items on a single subscription
  // share the same billing cycle in the Tower's pricing model.
  const currentPeriodEnd: number | null =
    typeof firstItem?.current_period_end === "number"
      ? firstItem.current_period_end
      : null;

  return {
    userId,
    eventType,
    resourceType: "stripe_subscription",
    resourceId: subscription.id,
    metadata: {
      status: subscription.status,
      tier: priceId ? tierFromPriceId(priceId) : null,
      current_period_end: currentPeriodEnd,
    },
  };
}

/** Translate Stripe event `type` to the Tower audit `event_type`. */
function subscriptionAuditEventType(
  stripeType: string,
): AuditEvent["eventType"] | null {
  switch (stripeType) {
    case "customer.subscription.created":
      return "subscription_created";
    case "customer.subscription.updated":
      return "subscription_updated";
    case "customer.subscription.deleted":
      return "subscription_canceled";
    default:
      return null;
  }
}
