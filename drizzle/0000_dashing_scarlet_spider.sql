CREATE TABLE `bookmarks` (
	`recipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `user_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`recipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `user_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`author_name` text NOT NULL,
	`title` text NOT NULL,
	`method` text NOT NULL,
	`bean` text NOT NULL,
	`roast` text DEFAULT '中煎り' NOT NULL,
	`grinder` text DEFAULT '' NOT NULL,
	`grind` text DEFAULT '中挽き' NOT NULL,
	`grind_clicks` text DEFAULT '' NOT NULL,
	`dose` real NOT NULL,
	`water` real NOT NULL,
	`temperature` real NOT NULL,
	`target_time` integer NOT NULL,
	`actual_time` integer,
	`hypothesis` text DEFAULT '' NOT NULL,
	`steps` text DEFAULT '[]' NOT NULL,
	`tasting` text DEFAULT '' NOT NULL,
	`rating` integer,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
