ALTER TABLE "applications" ADD COLUMN "position" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "conversion_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "stale_count" integer;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "applied_count" integer;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "screening_count" integer;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "interview_count" integer;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "offer_count" integer;--> statement-breakpoint
CREATE INDEX "idx_apps_user_status_pos" ON "applications" USING btree ("user_id","status","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_daily_snapshots_user_date" ON "daily_snapshots" USING btree ("user_id","date");