import type Stripe from "stripe";
import { tierFromPriceId } from "./server";
import type { AuditEvent } from "@/lib/audit/log";
import { hashCustomerEmail } from "./pii";

/**
 * Resolve the best-available customer email from a possibly-expanded Stripe
 * object. The webhook subscription does not request `expand=[customer]`, so
 * the direct `customer_email` / `receipt_email` is usually populated. But
 * if upstream Stripe configuration changes (or this code is invoked from a
 * `?expand=...` retrieval), the email can live on the expanded customer
 * object or in `charge.billing_details`. Falling through every source
 * eliminates the gap Codex flagged — an empty hash would silently lose the
 * support-correlation pivot, even though it never leaks raw PII.
 */
function resolveCustomerEmailFromInvoice(
  invoice: Stripe.Invoice,
): string | null {
  if (invoice.customer_email) return invoice.customer_email;
  if (
    typeof invoice.customer === "object" &&
    invoice.customer !== null &&
    !("deleted" in invoice.customer) &&
    invoice.customer.email
  ) {
    return invoice.customer.email;
  }
  return null;
}

function resolveCustomerEmailFromCharge(charge: Stripe.Charge): string | null {
  if (charge.receipt_email) return charge.receipt_email;
  if (charge.billing_details?.email) return charge.billing_details.email;
  if (
    typeof charge.customer === "object" &&
    charge.customer !== null &&
    !("deleted" in charge.customer) &&
    charge.customer.email
  ) {
    return charge.customer.email;
  }
  return null;
}

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

/**
 * Build a `payment_failed` audit row from `invoice.payment_failed`.
 *
 * Returns null when the event type does not match — keeps the caller's
 * dispatch site small. Metadata captures the financial fields support
 * needs (amount due, currency, attempt count, next retry timestamp) and
 * the hashed customer email so a support engineer can correlate the
 * audit trail to the Stripe dashboard without persisting raw PII.
 */
export function buildPaymentFailureAuditEvent(
  event: Stripe.Event,
  userId: string,
): AuditEvent | null {
  if (event.type !== "invoice.payment_failed") return null;

  const invoice = event.data.object as Stripe.Invoice;
  const amountDue: number | null =
    typeof invoice.amount_due === "number" ? invoice.amount_due : null;
  const attemptCount: number | null =
    typeof invoice.attempt_count === "number" ? invoice.attempt_count : null;
  const nextPaymentAttempt: number | null =
    typeof invoice.next_payment_attempt === "number"
      ? invoice.next_payment_attempt
      : null;

  return {
    userId,
    eventType: "payment_failed",
    resourceType: "stripe_invoice",
    resourceId: invoice.id ?? "",
    metadata: {
      amount_due: amountDue,
      currency: invoice.currency ?? null,
      attempt_count: attemptCount,
      next_payment_attempt: nextPaymentAttempt,
      // SHA-256 hashed — never the raw address. See ./pii.ts for rationale.
      // Resolver covers both unexpanded and expanded Stripe payloads.
      customer_email_hash: hashCustomerEmail(
        resolveCustomerEmailFromInvoice(invoice),
      ),
    },
  };
}

/**
 * Build a `refund_issued` audit row from `charge.refunded`.
 *
 * Metadata captures the refunded amount, currency, and the originating
 * payment intent so support can pivot to Stripe's surface without
 * storing the customer's email. Returns null for non-matching events.
 */
export function buildRefundAuditEvent(
  event: Stripe.Event,
  userId: string,
): AuditEvent | null {
  if (event.type !== "charge.refunded") return null;

  const charge = event.data.object as Stripe.Charge;
  const amountRefunded: number | null =
    typeof charge.amount_refunded === "number" ? charge.amount_refunded : null;

  const paymentIntentId: string | null =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  return {
    userId,
    eventType: "refund_issued",
    resourceType: "stripe_charge",
    resourceId: charge.id ?? "",
    metadata: {
      amount_refunded: amountRefunded,
      currency: charge.currency ?? null,
      payment_intent: paymentIntentId,
      customer_email_hash: hashCustomerEmail(
        resolveCustomerEmailFromCharge(charge),
      ),
    },
  };
}
