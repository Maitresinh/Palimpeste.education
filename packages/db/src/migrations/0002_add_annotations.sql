CREATE TABLE "annotation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"document_id" text NOT NULL,
	"cfi_range" text NOT NULL,
	"selected_text" text NOT NULL,
	"highlight_color" text DEFAULT '#fef08a' NOT NULL,
	"comment" text,
	"context" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"document_id" text NOT NULL,
	"current_location" text NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotation_userId_idx" ON "annotation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "annotation_documentId_idx" ON "annotation" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "annotation_userId_documentId_idx" ON "annotation" USING btree ("user_id","document_id");--> statement-breakpoint
CREATE INDEX "reading_progress_userId_idx" ON "reading_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_progress_documentId_idx" ON "reading_progress" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "reading_progress_userId_documentId_idx" ON "reading_progress" USING btree ("user_id","document_id");





