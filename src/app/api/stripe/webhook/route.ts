import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, tierFromPriceId } from "@/lib/stripe/server";
import { requireEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { logSecurityEvent } from "@/lib/audit/log";
import { buildSubscriptionAuditEvent } from "@/lib/stripe/webhook-audit";
import { stripeWebhookDuplicateDecision } from "@/lib/stripe/webhook-duplicate";

/**
 * Stripe webhook.
 *
 * Guarantees:
 *  - Raw body signature verification (Stripe SDK).
 *  - Idempotency via `stripe_webhook_events` primary-key on event.id.
 *  - Duplicate deliveries: already-processed events are acked; failed events
 *    are re-processed on retry; in-flight "received" rows ack without work
 *    unless stale (see webhook-duplicate.ts).
 *  - Failed handler updates never overwrite a "processed" row (concurrent retries).
 */
export const runtime = "nodejs";

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function finalizeWebhookSuccess(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  eventId: string,
): Promise<void> {
  await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", eventId);
}

async function finalizeWebhookFailure(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  eventId: string,
  message: string,
): Promise<void> {
  await supabase
    .from("stripe_webhook_events")
    .update({ status: "failed", error: message })
    .eq("id", eventId)
    .neq("status", "processed");
}

async function executeStripeWebhook(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  event: Stripe.Event,
): Promise<NextResponse> {
  try {
    await handleStripeEvent(event);
    await finalizeWebhookSuccess(supabase, event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    log.error("stripe.webhook.handler_failed", err, {
      eventId: event.id,
      type: event.type,
    });
    await finalizeWebhookFailure(supabase, event.id, message);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { STRIPE_WEBHOOK_SECRET } = requireEnv(["STRIPE_WEBHOOK_SECRET"] as const);

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(request);
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    log.warn("stripe.webhook.signature_verification_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: inserted, error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      status: "received",
      payload: event as unknown as Record<string, unknown>,
    })
    .select("id, status")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: row, error: rowError } = await supabase
        .from("stripe_webhook_events")
        .select("status, created_at, updated_at")
        .eq("id", event.id)
        .maybeSingle();

      if (rowError || !row) {
        log.error("stripe.webhook.duplicate_lookup_failed", rowError, {
          eventId: event.id,
        });
        return NextResponse.json(
          { error: "Failed to load webhook event row" },
          { status: 500 },
        );
      }

      const decision = stripeWebhookDuplicateDecision(
        {
          status: row.status as string,
          receivedAt: (row.updated_at ?? row.created_at) as string | null,
        },
        Date.now(),
      );

      if (decision === "ack_duplicate") {
        log.info("stripe.webhook.duplicate_processed", {
          eventId: event.id,
          type: event.type,
        });
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (decision === "ack_in_flight") {
        log.info("stripe.webhook.duplicate_in_flight", {
          eventId: event.id,
          type: event.type,
        });
        return NextResponse.json({
          received: true,
          duplicate: true,
          pending: true,
        });
      }

      log.info("stripe.webhook.duplicate_retry", { eventId: event.id, type: event.type });
      return executeStripeWebhook(supabase, event);
    }

    log.error("stripe.webhook.persist_failed", insertError, {
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json(
      { error: "Failed to record webhook event" },
      { status: 500 },
    );
  }

  log.info("stripe.webhook.received", {
    eventId: event.id,
    type: event.type,
    existing: inserted?.status,
  });

  return executeStripeWebhook(supabase, event);
}

/**
 * Resolve the Tower user id from a Stripe customer reference.
 *
 * Returns `null` when no matching profile is found — the webhook deliberately
 * treats this as "not a Tower customer we track" and acks without work, so
 * that a Stripe-side misroute does not spam retries.
 */
async function findUserIdByStripeCustomer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer,
): Promise<string | null> {
  const customerId = typeof customer === "string" ? customer : customer.id;

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .limit(1);
  if (error) {
    throw new Error(`Failed to find profile by customer id: ${error.message}`);
  }

  const userId = profiles?.[0]?.id as string | undefined;
  return userId ?? null;
}

/**
 * Write an `audit_logs` row for a Stripe subscription lifecycle event. Fire
 * and forget — never throws. We `await` it so tests get deterministic
 * behaviour, but the underlying helper swallows all errors.
 */
async function auditSubscriptionEvent(
  event: Stripe.Event,
  userId: string,
): Promise<void> {
  const auditEvent = buildSubscriptionAuditEvent(event, userId);
  if (!auditEvent) return;
  await logSecurityEvent(auditEvent);
}

/**
 * Dispatch table for Stripe event types. Only the events we care about are
 * listed — everything else gets acknowledged and ignored.
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const supabase = getSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) return;
      if (!session.subscription) return;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) return;

      const tier = tierFromPriceId(priceId);
      const { error } = await supabase
        .from("user_profiles")
        .update({ subscription_tier: tier })
        .eq("id", userId);
      if (error) {
        throw new Error(`Failed to persist checkout tier: ${error.message}`);
      }
      return;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await findUserIdByStripeCustomer(supabase, subscription.customer);
      if (!userId) return;

      // Local state is already reconciled by `checkout.session.completed`
      // when the subscription originates from a Tower checkout. For
      // subscriptions created through Stripe's billing portal or the API,
      // make sure `subscription_tier` matches the new plan so the audit
      // trail reflects the effective state.
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) {
        const tier = tierFromPriceId(priceId);
        const isActive =
          subscription.status === "active" || subscription.status === "trialing";
        const { error } = await supabase
          .from("user_profiles")
          .update({ subscription_tier: isActive ? tier : "free" })
          .eq("id", userId);
        if (error) {
          throw new Error(
            `Failed to persist subscription creation: ${error.message}`,
          );
        }
      }

      await auditSubscriptionEvent(event, userId);
      return;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;

      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) return;

      const tier = tierFromPriceId(priceId);

      const userId = await findUserIdByStripeCustomer(supabase, subscription.customer);
      if (!userId) return;

      const isActive =
        subscription.status === "active" || subscription.status === "trialing";
      const { error } = await supabase
        .from("user_profiles")
        .update({ subscription_tier: isActive ? tier : "free" })
        .eq("id", userId);
      if (error) {
        throw new Error(`Failed to persist subscription update: ${error.message}`);
      }

      await auditSubscriptionEvent(event, userId);
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      const userId = await findUserIdByStripeCustomer(supabase, subscription.customer);
      if (!userId) return;

      const { error } = await supabase
        .from("user_profiles")
        .update({ subscription_tier: "free" })
        .eq("id", userId);
      if (error) {
        throw new Error(
          `Failed to persist subscription deletion: ${error.message}`,
        );
      }

      await auditSubscriptionEvent(event, userId);
      return;
    }

    default:
      return;
  }
}
