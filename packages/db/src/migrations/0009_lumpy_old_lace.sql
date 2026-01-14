ALTER TABLE "user" ADD COLUMN "storage_used" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "storage_quota" bigint DEFAULT 524288000 NOT NULL;