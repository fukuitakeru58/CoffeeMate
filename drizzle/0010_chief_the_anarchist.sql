CREATE TABLE `auth_throttles` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_throttles_expires_idx` ON `auth_throttles` (`expires_at`);