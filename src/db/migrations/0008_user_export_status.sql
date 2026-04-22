ALTER TABLE "user_profiles" ADD COLUMN "data_export_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "data_export_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "data_export_last_delivered_at" timestamp with time zone;