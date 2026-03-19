CREATE TABLE "agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent" text,
	"worker" text,
	"action" text,
	"status" text,
	"input_summary" text,
	"output_summary" text,
	"error" text,
	"tokens_used" integer,
	"cost_cents" numeric(10, 2),
	"duration_ms" integer,
	"inngest_run_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent" text,
	"category" text,
	"content" text,
	"embedding" vector(1536),
	"importance" numeric(3, 2) DEFAULT '0.50',
	"access_count" integer DEFAULT 0,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_memory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"role" text NOT NULL,
	"url" text,
	"status" text DEFAULT 'discovered' NOT NULL,
	"tier" integer,
	"applied_at" timestamp with time zone,
	"source" text,
	"notes" text,
	"sector" text,
	"contact_id" uuid,
	"salary" text,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_event_id" text,
	"title" text,
	"description" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"location" text,
	"interview_id" uuid,
	"source" text DEFAULT 'google',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_google_event_id_unique" UNIQUE("google_event_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"industry" text,
	"sector" text,
	"size" text,
	"headquarters" text,
	"description" text,
	"culture_summary" text,
	"recent_news" text,
	"financials_summary" text,
	"research_freshness" timestamp with time zone,
	"tier" integer,
	"logo_url" text,
	"careers_url" text,
	"linkedin_url" text,
	"glassdoor_url" text,
	"sec_cik" text,
	"key_people" jsonb,
	"internship_intel" text,
	"your_connections" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"content" text,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_embeddings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"title" text,
	"linkedin_url" text,
	"relationship" text,
	"phone" text,
	"introduced_by" text,
	"warmth" integer DEFAULT 50,
	"last_contact_at" timestamp with time zone,
	"notes" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"total_applications" integer,
	"active_pipeline" integer,
	"interviews_scheduled" integer,
	"offers" integer,
	"rejections" integer,
	"emails_processed" integer,
	"agents_runs" integer,
	"total_cost_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid,
	"company_id" uuid,
	"type" text,
	"title" text,
	"content" text,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT false,
	"parent_id" uuid,
	"generated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gmail_id" text,
	"thread_id" text,
	"application_id" uuid,
	"contact_id" uuid,
	"from_address" text,
	"to_address" text,
	"subject" text,
	"snippet" text,
	"body_text" text,
	"classification" text,
	"urgency" text,
	"suggested_action" text,
	"is_read" boolean DEFAULT false,
	"is_processed" boolean DEFAULT false,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_gmail_id_unique" UNIQUE("gmail_id")
);
--> statement-breakpoint
ALTER TABLE "emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"company_id" uuid,
	"round" text,
	"format" text,
	"scheduled_at" timestamp with time zone,
	"duration_minutes" integer DEFAULT 60,
	"location" text,
	"interviewer_name" text,
	"interviewer_title" text,
	"interviewer_linkedin" text,
	"status" text,
	"prep_packet_id" uuid,
	"debrief_id" uuid,
	"calendar_event_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"content" text,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_embeddings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text,
	"priority" text,
	"title" text,
	"body" text,
	"source_agent" text,
	"source_entity_id" uuid,
	"source_entity_type" text,
	"channels" jsonb,
	"is_read" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"actions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outreach_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid,
	"contact_id" uuid,
	"company_id" uuid,
	"type" text,
	"subject" text,
	"body" text,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"generated_by" text,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"resend_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outreach_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "progression_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"milestone" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now(),
	"floor_unlocked" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progression_milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"timezone" text DEFAULT 'America/New_York',
	"onboarding_step" integer DEFAULT 0,
	"progression_level" integer DEFAULT 0,
	"google_tokens" jsonb,
	"preferences" jsonb,
	"stripe_customer_id" text,
	"subscription_tier" text DEFAULT 'free',
	"last_floor_visited" text DEFAULT 'PH',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_embeddings" ADD CONSTRAINT "company_embeddings_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_embeddings" ADD CONSTRAINT "company_embeddings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD CONSTRAINT "daily_snapshots_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_prep_packet_id_documents_id_fk" FOREIGN KEY ("prep_packet_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_debrief_id_documents_id_fk" FOREIGN KEY ("debrief_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_embeddings" ADD CONSTRAINT "job_embeddings_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_embeddings" ADD CONSTRAINT "job_embeddings_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_queue" ADD CONSTRAINT "outreach_queue_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_queue" ADD CONSTRAINT "outreach_queue_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_queue" ADD CONSTRAINT "outreach_queue_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_queue" ADD CONSTRAINT "outreach_queue_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progression_milestones" ADD CONSTRAINT "progression_milestones_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_logs_user_agent" ON "agent_logs" USING btree ("user_id","agent");--> statement-breakpoint
CREATE INDEX "idx_apps_user_status" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_apps_user_company" ON "applications" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_apps_created" ON "applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cal_user_start" ON "calendar_events" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_companies_user_tier" ON "companies" USING btree ("user_id","tier");--> statement-breakpoint
CREATE INDEX "idx_contacts_user_company" ON "contacts" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_warmth" ON "contacts" USING btree ("warmth");--> statement-breakpoint
CREATE INDEX "idx_snap_user_date" ON "daily_snapshots" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_docs_user_app" ON "documents" USING btree ("user_id","application_id");--> statement-breakpoint
CREATE INDEX "idx_docs_type" ON "documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_emails_gmail_id" ON "emails" USING btree ("gmail_id");--> statement-breakpoint
CREATE INDEX "idx_emails_user_class" ON "emails" USING btree ("user_id","classification");--> statement-breakpoint
CREATE INDEX "idx_interviews_user_sched" ON "interviews" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_notif_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_outreach_user_status" ON "outreach_queue" USING btree ("user_id","status");--> statement-breakpoint
CREATE POLICY "agent_logs_user_isolation" ON "agent_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "agent_memory_user_isolation" ON "agent_memory" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "applications_user_isolation" ON "applications" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendar_events_user_isolation" ON "calendar_events" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "companies_user_isolation" ON "companies" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "company_embeddings_user_isolation" ON "company_embeddings" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "contacts_user_isolation" ON "contacts" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "daily_snapshots_user_isolation" ON "daily_snapshots" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "documents_user_isolation" ON "documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "emails_user_isolation" ON "emails" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "interviews_user_isolation" ON "interviews" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "job_embeddings_user_isolation" ON "job_embeddings" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notifications_user_isolation" ON "notifications" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "outreach_queue_user_isolation" ON "outreach_queue" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "progression_milestones_user_isolation" ON "progression_milestones" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "user_profiles_self_access" ON "user_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = id) WITH CHECK (auth.uid() = id);