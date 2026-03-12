CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`tier` text NOT NULL,
	`sector` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`applied_at` integer NOT NULL,
	`platform` text,
	`contact_name` text,
	`contact_email` text,
	`contact_role` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_status` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tier` ON `applications` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_company` ON `applications` (`company`);--> statement-breakpoint
CREATE INDEX `idx_applied_at` ON `applications` (`applied_at`);--> statement-breakpoint
CREATE TABLE `company_research` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`research_json` text,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_research_company_name_unique` ON `company_research` (`company_name`);--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`due_at` integer NOT NULL,
	`completed_at` integer,
	`note` text,
	`dismissed` integer DEFAULT false,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
