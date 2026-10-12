ALTER TABLE `beans` ADD `roast` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `beans` ADD `altitude` integer;--> statement-breakpoint
ALTER TABLE `recipes` ADD `actual_brew` text;