CREATE TYPE "public"."group_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."group_type" AS ENUM('CLASS', 'CLUB');--> statement-breakpoint
CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('access_request', 'access_approved', 'access_rejected', 'group_invite', 'new_annotation', 'system');--> statement-breakpoint
CREATE TABLE "group_access_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"message" text,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"response_message" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"resource_id" text,
	"is_read" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "type" "group_type" DEFAULT 'CLASS' NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "allow_social_export" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "annotation_hub_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group_member" ADD COLUMN "role" "group_role" DEFAULT 'MEMBER' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_access_request" ADD CONSTRAINT "group_access_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_access_request" ADD CONSTRAINT "group_access_request_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_access_request_userId_idx" ON "group_access_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_access_request_groupId_idx" ON "group_access_request" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_access_request_status_idx" ON "group_access_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_userId_idx" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_isRead_idx" ON "notification" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "notification" USING btree ("type");