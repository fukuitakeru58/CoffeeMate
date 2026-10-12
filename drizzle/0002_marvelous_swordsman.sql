CREATE TABLE `beans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`region` text DEFAULT '' NOT NULL,
	`farm` text DEFAULT '' NOT NULL,
	`variety` text DEFAULT '' NOT NULL,
	`process` text DEFAULT '' NOT NULL,
	`terroir` text DEFAULT '' NOT NULL,
	`purchase_place` text DEFAULT '' NOT NULL,
	`purchase_map_url` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beans_user_name_key` ON `beans` (`user_id`,`name_key`);--> statement-breakpoint
CREATE TABLE `grinders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`max_clicks` integer DEFAULT 60 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grinders_user_name` ON `grinders` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `recipe_counters` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `bean_id` text REFERENCES beans(id);