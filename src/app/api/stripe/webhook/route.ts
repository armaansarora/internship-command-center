import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, tierFromPriceId } from "@/lib/stripe/server";

// Next.js App Router requires raw body for Stripe signature verification
export const runtime = "nodejs";

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(request);
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId) {
            const tier = tierFromPriceId(priceId);
            const { error } = await supabase
              .from("user_profiles")
              .update({ subscription_tier: tier })
              .eq("id", userId);

            if (error) {
              throw new Error(`Failed to persist checkout tier: ${error.message}`);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) break;

        const tier = tierFromPriceId(priceId);

        const { data: profiles, error: lookupError } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .limit(1);

        if (lookupError) {
          throw new Error(`Failed to find profile by customer id: ${lookupError.message}`);
        }

        const userId = profiles?.[0]?.id as string | undefined;
        if (!userId) break;

        const isActive =
          subscription.status === "active" || subscription.status === "trialing";
        const { error } = await supabase
          .from("user_profiles")
          .update({ subscription_tier: isActive ? tier : "free" })
          .eq("id", userId);

        if (error) {
          throw new Error(`Failed to persist subscription update: ${error.message}`);
        }
        break;
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
          throw new Error(`Failed to find profile by customer id: ${lookupError.message}`);
        }

        const userId = profiles?.[0]?.id as string | undefined;
        if (!userId) break;

        const { error } = await supabase
          .from("user_profiles")
          .update({ subscription_tier: "free" })
          .eq("id", userId);

        if (error) {
          throw new Error(`Failed to persist subscription deletion: ${error.message}`);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process Stripe webhook event";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
