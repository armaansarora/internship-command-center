CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_created" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_event_type" ON "audit_logs" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE POLICY "audit_logs_self_read" ON "audit_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint

-- =============================================================================
-- Hand-edits (drizzle-kit cannot express these):
--
--   1. CHECK constraint pinning event_type to the TypeScript union declared
--      in src/lib/audit/log.ts — keeps DB and app in lockstep so a drift
--      fails loudly at insert time rather than producing junk audit rows.
--   2. Re-type ip_address from text → inet so Postgres validates + indexes
--      addresses properly. We declare the column as text in the Drizzle
--      schema because drizzle-orm's pg-core has no native inet helper; the
--      type mismatch is intentional and isolated to this one column.
-- =============================================================================
ALTER TABLE "audit_logs"
	ADD CONSTRAINT "audit_logs_event_type_check"
	CHECK (event_type IN (
		'oauth_connected','oauth_disconnected',
		'data_exported','data_delete_requested','data_delete_canceled','data_hard_deleted',
		'agent_side_effect_email_sent','agent_side_effect_status_updated',
		'prompt_injection_detected',
		'subscription_created','subscription_canceled','subscription_updated',
		'login_succeeded','login_failed'
	));--> statement-breakpoint

ALTER TABLE "audit_logs"
	ALTER COLUMN "ip_address" TYPE inet USING nullif(ip_address, '')::inet;