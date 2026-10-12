CREATE TABLE `ratings` (
	`recipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	`score` integer NOT NULL,
	PRIMARY KEY(`recipe_id`, `user_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
