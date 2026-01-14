CREATE TABLE "reader_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"font_size" integer DEFAULT 16 NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"line_height" integer DEFAULT 150 NOT NULL,
	"font_family" text DEFAULT 'system-ui' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reader_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "deadline" timestamp;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "auto_archive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "annotation" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "reader_settings" ADD CONSTRAINT "reader_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reader_settings_userId_idx" ON "reader_settings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_parent_id_annotation_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."annotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotation_parentId_idx" ON "annotation" USING btree ("parent_id");