import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, tierFromPriceId } from "@/lib/stripe/server";
import { requireEnv } from "@/lib/env";
import { log } from "@/lib/logger";

/**
 * Stripe webhook.
 *
 * Guarantees:
 *  - Raw body signature verification (Stripe SDK).
 *  - Exactly-once processing via `stripe_webhook_events` primary-key
 *    insert; retries of the same event.id return 200 immediately.
 *  - Every event is audited (status, error, timestamps).
 *  - Returns 2xx to Stripe even on handler failure if the event has
 *    already been persisted, so a transient downstream issue doesn't
 *    spam retries forever — retries can be triggered manually via the
 *    Stripe dashboard.
 */
export const runtime = "nodejs";

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: Request): Promise<NextResponse> {
  const { STRIPE_WEBHOOK_SECRET } = requireEnv(["STRIPE_WEBHOOK_SECRET"] as const);

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(request);
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    log.warn("stripe.webhook.signature_verification_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // ── Idempotency: INSERT the event row. If it already exists, return 200.
  const { data: existing, error: insertError } = await supabase
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
    // Unique violation — we've seen this event before. Acknowledge and stop.
    if (insertError.code === "23505") {
      log.info("stripe.webhook.duplicate", { eventId: event.id, type: event.type });
      return NextResponse.json({ received: true, duplicate: true });
    }
    log.error("stripe.webhook.persist_failed", insertError, {
      eventId: event.id,
      type: event.type,
    });
    // Return 500 so Stripe retries — we haven't recorded this yet.
    return NextResponse.json(
      { error: "Failed to record webhook event" },
      { status: 500 }
    );
  }

  log.info("stripe.webhook.received", {
    eventId: event.id,
    type: event.type,
    existing: existing?.status,
  });

  try {
    await handleStripeEvent(event);

    await supabase
      .from("stripe_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    log.error("stripe.webhook.handler_failed", err, {
      eventId: event.id,
      type: event.type,
    });

    await supabase
      .from("stripe_webhook_events")
      .update({ status: "failed", error: message })
      .eq("id", event.id);

    // 500 — Stripe will retry; idempotent INSERT guarantees we don't
    // double-apply the update on retry.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
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

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) return;

      const tier = tierFromPriceId(priceId);

      const { data: profiles, error: lookupError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);
      if (lookupError) {
        throw new Error(
          `Failed to find profile by customer id: ${lookupError.message}`
        );
      }

      const userId = profiles?.[0]?.id as string | undefined;
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
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { data: profiles, error: lookupError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);
      if (lookupError) {
        throw new Error(
          `Failed to find profile by customer id: ${lookupError.message}`
        );
      }

      const userId = profiles?.[0]?.id as string | undefined;
      if (!userId) return;

      const { error } = await supabase
        .from("user_profiles")
        .update({ subscription_tier: "free" })
        .eq("id", userId);
      if (error) {
        throw new Error(
          `Failed to persist subscription deletion: ${error.message}`
        );
      }
      return;
    }

    default:
      // Acknowledged but ignored. Recorded in stripe_webhook_events for audit.
      return;
  }
}
