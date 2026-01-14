CREATE TABLE "group_share_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"total_shares" integer DEFAULT 0 NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_share_stats_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "shared_citation" (
	"id" text PRIMARY KEY NOT NULL,
	"annotation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"document_id" text NOT NULL,
	"platform" text NOT NULL,
	"citation_text" text NOT NULL,
	"book_title" text NOT NULL,
	"book_author" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_share_stats" ADD CONSTRAINT "group_share_stats_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_citation" ADD CONSTRAINT "shared_citation_annotation_id_annotation_id_fk" FOREIGN KEY ("annotation_id") REFERENCES "public"."annotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_citation" ADD CONSTRAINT "shared_citation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_citation" ADD CONSTRAINT "shared_citation_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_citation" ADD CONSTRAINT "shared_citation_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shared_citation_annotationId_idx" ON "shared_citation" USING btree ("annotation_id");--> statement-breakpoint
CREATE INDEX "shared_citation_userId_idx" ON "shared_citation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shared_citation_groupId_idx" ON "shared_citation" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "shared_citation_documentId_idx" ON "shared_citation" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "shared_citation_platform_idx" ON "shared_citation" USING btree ("platform");