CREATE TABLE "file_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"document_id" uuid,
	"fund_id" uuid,
	"uploaded_by" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_sha256" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"original_filename" text,
	"artifact_type" text,
	"source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"checksum_verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "file_artifacts" ADD CONSTRAINT "file_artifacts_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_artifacts" ADD CONSTRAINT "file_artifacts_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_artifacts" ADD CONSTRAINT "file_artifacts_fund_id_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE no action ON UPDATE no action;
