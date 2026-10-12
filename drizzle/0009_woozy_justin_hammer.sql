CREATE TABLE `local_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`username_key` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_accounts_username_key` ON `local_accounts` (`username_key`);--> statement-breakpoint
CREATE TABLE `local_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `local_sessions_user_idx` ON `local_sessions` (`user_id`);