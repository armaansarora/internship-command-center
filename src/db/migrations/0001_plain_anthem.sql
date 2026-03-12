CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`email` text,
	`phone` text,
	`role` text,
	`relationship_type` text NOT NULL,
	`introduced_by` integer,
	`last_contacted_at` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`introduced_by`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_company` ON `contacts` (`company`);--> statement-breakpoint
CREATE INDEX `idx_contacts_last_contacted` ON `contacts` (`last_contacted_at`);--> statement-breakpoint
CREATE TABLE `cover_letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`is_active` integer DEFAULT false,
	`generated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_cover_letters_company` ON `cover_letters` (`company`);--> statement-breakpoint
CREATE INDEX `idx_cover_letters_application` ON `cover_letters` (`application_id`);--> statement-breakpoint
CREATE TABLE `interview_prep` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`content` text NOT NULL,
	`generated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_interview_prep_application` ON `interview_prep` (`application_id`);