ALTER TABLE "document" ADD COLUMN "author" text;--> statement-breakpoint
ALTER TABLE "reader_settings" ADD COLUMN "reading_mode" text DEFAULT 'paginated' NOT NULL;