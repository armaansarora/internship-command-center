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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      // Fetch the subscription to get price ID
      if (session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          const tier = tierFromPriceId(priceId);
          await supabase
            .from("user_profiles")
            .update({ subscription_tier: tier })
            .eq("id", userId);
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

      // Look up user by stripe_customer_id
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      const userId = profiles?.[0]?.id as string | undefined;
      if (!userId) break;

      // Handle cancellation/inactive subscription
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      await supabase
        .from("user_profiles")
        .update({ subscription_tier: isActive ? tier : "free" })
        .eq("id", userId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      const userId = profiles?.[0]?.id as string | undefined;
      if (!userId) break;

      await supabase
        .from("user_profiles")
        .update({ subscription_tier: "free" })
        .eq("id", userId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
