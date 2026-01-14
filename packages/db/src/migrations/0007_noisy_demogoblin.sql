CREATE TYPE "public"."activity_type" AS ENUM('user_signup', 'user_login', 'user_logout', 'user_role_changed', 'user_deleted', 'teacher_request', 'teacher_approved', 'teacher_rejected', 'group_created', 'group_deleted', 'document_uploaded', 'document_deleted', 'admin_action');--> statement-breakpoint
CREATE TYPE "public"."teacher_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "activity_type" NOT NULL,
	"user_id" text,
	"actor_id" text,
	"description" text NOT NULL,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "teacher_request_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"organization" text,
	"response_message" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_request" ADD CONSTRAINT "teacher_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_request" ADD CONSTRAINT "teacher_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_type_idx" ON "activity_log" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activity_log_userId_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_log_actorId_idx" ON "activity_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "teacher_request_userId_idx" ON "teacher_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_request_status_idx" ON "teacher_request" USING btree ("status");