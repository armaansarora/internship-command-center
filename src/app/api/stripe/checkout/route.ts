import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  createCheckoutSession,
  createSeasonPassCheckoutSession,
} from "@/lib/stripe/server";
import { STRIPE_PLANS } from "@/lib/stripe/config";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/http/request-body";
import { z } from "zod";

/**
 * Static price-id allowlist for recurring SKUs (Free / Pro). Season Pass is
 * NOT included here — its priceId is sourced from env at request time and
 * matched in the `tier === "seasonPass"` branch below.
 */
const VALID_RECURRING_PRICE_IDS: ReadonlySet<string> = new Set(
  Object.values(STRIPE_PLANS).flatMap((plan) =>
    plan.yearlyPriceId ? [plan.priceId, plan.yearlyPriceId] : [plan.priceId],
  ).filter((id): id is string => id.length > 0),
);

const CheckoutSchema = z.discriminatedUnion("tier", [
  z.object({
    tier: z.literal("seasonPass"),
    // priceId is intentionally absent on the seasonPass branch — the server
    // looks it up from env so the client cannot inject an arbitrary one-time
    // SKU id.
  }),
  z.object({
    tier: z.literal("recurring").optional(),
    priceId: z
      .string()
      .min(1)
      .refine(
        (value) => VALID_RECURRING_PRICE_IDS.has(value),
        "Unknown priceId",
      ),
  }),
]);

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;

  const body = await readJsonBodyWithLimit(request, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.error },
      { status: body.status, headers: rate.headers },
    );
  }
  const parsed = CheckoutSchema.safeParse(body.value);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: rate.headers },
    );
  }

  const email = user.email ?? "";

  try {
    if (parsed.data.tier === "seasonPass") {
      const seasonPassPriceId = env().STRIPE_SEASON_PASS_PRICE_ID;
      if (!seasonPassPriceId) {
        // Defensive null-check: the Season Pass branch fired but the env var
        // is unset. Throw a clear, named error so the operator immediately
        // knows what to fix (paste the price id into Vercel env). The 500
        // catch below shields the underlying message from end users.
        throw new Error(
          "Invalid env: STRIPE_SEASON_PASS_PRICE_ID unset",
        );
      }
      const url = await createSeasonPassCheckoutSession(
        user.id,
        email,
        seasonPassPriceId,
      );
      return NextResponse.json({ url }, { headers: rate.headers });
    }

    const url = await createCheckoutSession(user.id, email, parsed.data.priceId);
    return NextResponse.json({ url }, { headers: rate.headers });
  } catch (err) {
    log.error("stripe.checkout.create_session_failed", err, { userId: user.id });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers: rate.headers },
    );
  }
}
