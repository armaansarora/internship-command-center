import { NextResponse } from "next/server";

/**
 * Placeholder for future signed webhooks (Stripe, Inngest, etc.).
 * Middleware allows /api/webhooks without a session — keep handlers strict.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "No webhook receiver configured for this path." },
    { status: 404 }
  );
}

export function POST(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "No webhook receiver configured for this path." },
    { status: 404 }
  );
}
