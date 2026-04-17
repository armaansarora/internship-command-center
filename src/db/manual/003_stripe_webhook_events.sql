-- ================================================================
-- Stripe webhook idempotency + audit trail
-- Run in Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  -- Stripe event id (evt_…). Primary key guarantees we can't double-process.
  id            text PRIMARY KEY,
  type          text NOT NULL,
  livemode      boolean NOT NULL DEFAULT false,
  received_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  status        text NOT NULL DEFAULT 'received',
  error         text,
  payload       jsonb
);

-- Useful for ops triage.
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type_received
  ON public.stripe_webhook_events (type, received_at DESC);

-- Locked to the service role. The checkout webhook runs with the service
-- role key and never via a user session, so `authenticated` has no access.
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_webhook_events_service_only"
  ON public.stripe_webhook_events;

-- Empty policy: no grants to authenticated/anon ⇒ only service role reads/writes.
CREATE POLICY "stripe_webhook_events_service_only"
  ON public.stripe_webhook_events
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
