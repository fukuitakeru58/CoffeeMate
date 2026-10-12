CREATE TABLE `drippers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drippers_user_name_key` ON `drippers` (`user_id`,`name_key`);--> statement-breakpoint
ALTER TABLE `recipes` ADD `dripper` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `recipes` ADD `dripper_id` text REFERENCES drippers(id);