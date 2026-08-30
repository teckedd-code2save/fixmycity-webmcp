CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`inspector_id` text NOT NULL,
	`report_id` text NOT NULL,
	`stop_order` integer NOT NULL,
	`route_id` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`assigned_at` integer NOT NULL,
	FOREIGN KEY (`inspector_id`) REFERENCES `inspectors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assignments_inspector_status` ON `assignments` (`inspector_id`,`status`);--> statement-breakpoint
CREATE TABLE `inspectors` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`phone` text,
	`transport` text DEFAULT 'car' NOT NULL,
	`availability` text DEFAULT 'available' NOT NULL,
	`start_latitude` real NOT NULL,
	`start_longitude` real NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'resident' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`confidence` integer NOT NULL,
	`explanation` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_at` integer
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`address` text NOT NULL,
	`landmark` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`affected_people` integer DEFAULT 1 NOT NULL,
	`confirmations` integer DEFAULT 1 NOT NULL,
	`reporter_id` text NOT NULL,
	`duplicate_of` text,
	`image_key` text,
	`priority_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reports_status_category` ON `reports` (`status`,`category`);--> statement-breakpoint
CREATE INDEX `idx_reports_priority` ON `reports` (`priority_score`);--> statement-breakpoint
CREATE INDEX `idx_reports_location` ON `reports` (`latitude`,`longitude`);--> statement-breakpoint
CREATE TABLE `updates` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text,
	`image_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_updates_report_created` ON `updates` (`report_id`,`created_at`);