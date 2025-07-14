CREATE TABLE `search_index` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`title` text,
	`content` text,
	`metadata` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `search_index_entity_id_idx` ON `search_index` (`entity_id`);--> statement-breakpoint
CREATE INDEX `search_index_entity_type_idx` ON `search_index` (`entity_type`);--> statement-breakpoint
CREATE INDEX `search_index_created_at_idx` ON `search_index` (`created_at`);--> statement-breakpoint
CREATE TABLE `search_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
