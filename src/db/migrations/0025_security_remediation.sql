-- 0025_security_remediation.sql
-- Hardening for the May 2026 repository-wide security scan.

-- ---------------------------------------------------------------------------
-- outreach_queue: authenticated users may read their own queue rows, but all
-- writes are now server-controlled. This prevents direct Supabase REST clients
-- from setting status='approved' / send_after<=now and feeding the service-role
-- cron sender.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "outreach_queue_user_isolation" ON "outreach_queue";
DROP POLICY IF EXISTS "outreach_queue_user_select" ON "outreach_queue";
CREATE POLICY "outreach_queue_user_select" ON "outreach_queue"
  FOR SELECT TO "authenticated"
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- rejection_reflections: one reflection per user/application, not one global
-- application_id across all tenants.
-- ---------------------------------------------------------------------------
ALTER TABLE "rejection_reflections"
  DROP CONSTRAINT IF EXISTS "rejection_reflections_app_unique";
ALTER TABLE "rejection_reflections"
  DROP CONSTRAINT IF EXISTS "rejection_reflections_application_id_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "rejection_reflections_user_application_unique"
  ON "rejection_reflections" ("user_id", "application_id");

-- ---------------------------------------------------------------------------
-- user_profiles: make the manual billing/token guard part of versioned
-- migration history so entitlement and OAuth-token fields cannot be changed
-- by authenticated REST clients if manual SQL was missed in an environment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_user_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      RAISE EXCEPTION 'subscription_tier is managed by billing workflows';
    END IF;

    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'stripe_customer_id is managed by billing workflows';
    END IF;

    IF NEW.google_tokens IS DISTINCT FROM OLD.google_tokens THEN
      RAISE EXCEPTION 'google_tokens are managed by OAuth handlers';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_profiles_sensitive ON user_profiles;
CREATE TRIGGER trg_guard_user_profiles_sensitive
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile_sensitive_fields();
