#!/usr/bin/env bash
#
# Bootstrap Stripe LIVE-mode products, prices, and webhook for The Tower.
#
# Creates 3 products (Free / Pro / Season Pass), 4 prices (Free $0/mo,
# Pro $29/mo + $296/yr, Season Pass $149 one-time), and 1 webhook endpoint
# pointing at https://www.interntower.com/api/stripe/webhook.
#
# The legacy `Team` SKU is intentionally NOT created — it was killed in the
# Season Pass council fork and replaced by the contact-sales "Campus" tier.
# A commented placeholder is kept further down for rollback.
#
# Outputs:
#   - Pretty terminal table with all IDs you need
#   - .stripe-ids.json  (gitignored — for re-reference, contains webhook secret)
#
# Prereqs:
#   brew install stripe/stripe-cli/stripe jq
#   stripe login                       (one-time)
#   export STRIPE_API_KEY=sk_live_...  (paste your live secret key)
#
# Run:
#   bash scripts/stripe-bootstrap.sh
#

set -euo pipefail

# ── Sanity checks ────────────────────────────────────────────────────
if [[ -z "${STRIPE_API_KEY:-}" ]]; then
  echo "ERROR: STRIPE_API_KEY is not set."
  echo ""
  echo "Get your live secret key from:"
  echo "  https://dashboard.stripe.com/apikeys"
  echo "(toggle to LIVE mode in the top-left, then 'Reveal live key')"
  echo ""
  echo "Then run:"
  echo "  export STRIPE_API_KEY=sk_live_..."
  echo "  bash scripts/stripe-bootstrap.sh"
  exit 1
fi

if [[ "$STRIPE_API_KEY" != sk_live_* ]]; then
  echo "ERROR: STRIPE_API_KEY must start with sk_live_ (you appear to have a test key)."
  echo "Aborting before any test-mode products are created."
  exit 1
fi

if ! command -v stripe >/dev/null 2>&1; then
  echo "ERROR: stripe CLI not installed."
  echo "Install with:  brew install stripe/stripe-cli/stripe"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq not installed."
  echo "Install with:  brew install jq"
  exit 1
fi

echo "──────────────────────────────────────────────────────────"
echo " The Tower — Stripe LIVE-mode bootstrap"
echo "──────────────────────────────────────────────────────────"
echo ""

# ── Free ─────────────────────────────────────────────────────────────
echo "Creating Free product…"
FREE_PRODUCT=$(stripe products create \
  -d "name=Free" \
  -d "description=The Tower — Free tier. Up to 10 applications, 25 AI calls/day, basic floors." \
  | jq -r .id)

FREE_MONTHLY=$(stripe prices create \
  -d "product=$FREE_PRODUCT" \
  -d "unit_amount=0" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  | jq -r .id)
echo "  ✓ Free          $FREE_PRODUCT  /  $FREE_MONTHLY (monthly)"

# ── Pro ──────────────────────────────────────────────────────────────
echo "Creating Pro product…"
PRO_PRODUCT=$(stripe products create \
  -d "name=Pro" \
  -d "description=The Tower — Pro tier. Unlimited applications, all 7 floors, all 8 AI agents, daily briefing." \
  | jq -r .id)

PRO_MONTHLY=$(stripe prices create \
  -d "product=$PRO_PRODUCT" \
  -d "unit_amount=2900" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  | jq -r .id)

PRO_YEARLY=$(stripe prices create \
  -d "product=$PRO_PRODUCT" \
  -d "unit_amount=29600" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  | jq -r .id)
echo "  ✓ Pro           $PRO_PRODUCT"
echo "      monthly     $PRO_MONTHLY"
echo "      yearly      $PRO_YEARLY"

# ── Internship Season Pass (one-time) ────────────────────────────────
# $149 one-time payment covering Aug 1 → Apr 30. NOT a recurring SKU —
# Stripe price is created without `recurring[*]`, and the checkout route
# uses `mode: "payment"` instead of `mode: "subscription"`.
echo "Creating Internship Season Pass product…"
SEASON_PASS_PRODUCT=$(stripe products create \
  -d "name=Internship Season Pass" \
  -d "description=The Tower — Internship Season Pass. One-time $149 payment covering the Aug → Apr internship search season. Unlimited applications, all 8 AI agents, daily briefing." \
  | jq -r .id)

SEASON_PASS_PRICE=$(stripe prices create \
  -d "product=$SEASON_PASS_PRODUCT" \
  -d "unit_amount=14900" \
  -d "currency=usd" \
  | jq -r .id)
echo "  ✓ Season Pass   $SEASON_PASS_PRODUCT  /  $SEASON_PASS_PRICE (one-time)"

# ── Team — KILLED in the Season Pass council fork ────────────────────
# Kept as a commented placeholder for rollback. To re-introduce: uncomment,
# re-run the script with STRIPE_API_KEY set, then update
# src/lib/stripe/config.ts STRIPE_PLANS.team accordingly.
#
# echo "Creating Team product…"
# TEAM_PRODUCT=$(stripe products create \
#   -d "name=Team" \
#   -d "description=The Tower — Team tier. Pro features plus shared War Room and priority support." \
#   | jq -r .id)
#
# TEAM_MONTHLY=$(stripe prices create \
#   -d "product=$TEAM_PRODUCT" \
#   -d "unit_amount=7900" \
#   -d "currency=usd" \
#   -d "recurring[interval]=month" \
#   | jq -r .id)
#
# TEAM_YEARLY=$(stripe prices create \
#   -d "product=$TEAM_PRODUCT" \
#   -d "unit_amount=80600" \
#   -d "currency=usd" \
#   -d "recurring[interval]=year" \
#   | jq -r .id)
# echo "  ✓ Team          $TEAM_PRODUCT"
# echo "      monthly     $TEAM_MONTHLY"
# echo "      yearly      $TEAM_YEARLY"

# ── Webhook endpoint ─────────────────────────────────────────────────
echo "Creating webhook endpoint…"
WEBHOOK_JSON=$(stripe webhook_endpoints create \
  -d "url=https://www.interntower.com/api/stripe/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted")

WEBHOOK_ID=$(echo "$WEBHOOK_JSON" | jq -r .id)
WEBHOOK_SECRET=$(echo "$WEBHOOK_JSON" | jq -r .secret)
echo "  ✓ Webhook       $WEBHOOK_ID"

# ── Persist for re-reference ─────────────────────────────────────────
cat > .stripe-ids.json <<EOF
{
  "free":       { "productId": "$FREE_PRODUCT",        "priceId": "$FREE_MONTHLY",      "yearlyPriceId": null },
  "pro":        { "productId": "$PRO_PRODUCT",         "priceId": "$PRO_MONTHLY",       "yearlyPriceId": "$PRO_YEARLY" },
  "seasonPass": { "productId": "$SEASON_PASS_PRODUCT", "priceId": "$SEASON_PASS_PRICE", "yearlyPriceId": null },
  "webhook":    { "id": "$WEBHOOK_ID", "secret": "$WEBHOOK_SECRET" }
}
EOF

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────────"
echo " DONE. Send these to Claude (copy the block below):"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "free.productId           = $FREE_PRODUCT"
echo "free.priceId             = $FREE_MONTHLY"
echo "pro.productId            = $PRO_PRODUCT"
echo "pro.priceId              = $PRO_MONTHLY"
echo "pro.yearlyPriceId        = $PRO_YEARLY"
echo "seasonPass.productId     = $SEASON_PASS_PRODUCT"
echo "seasonPass.priceId       = $SEASON_PASS_PRICE"
echo ""
echo "──────────────────────────────────────────────────────────"
echo " SEASON PASS — paste this into Vercel env (production):"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "  printf '%s' '$SEASON_PASS_PRICE' | vercel env add STRIPE_SEASON_PASS_PRICE_ID production --force"
echo ""
echo "──────────────────────────────────────────────────────────"
echo " WEBHOOK SECRET — push to Vercel production:"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "  printf '%s' '$WEBHOOK_SECRET' | vercel env add STRIPE_WEBHOOK_SECRET production --force"
echo ""
echo "  (then redeploy from Vercel dashboard, or push any commit)"
echo ""
echo "All values also saved to .stripe-ids.json (gitignored)."
echo ""
