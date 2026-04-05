CREATE TABLE "compliance_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"control_category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_policies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "version_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"evidence_note" text,
	CONSTRAINT "version_checklist_items_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "version_checklist_items_document_version_id_code_unique" UNIQUE("document_version_id","code")
);
--> statement-breakpoint
CREATE TABLE "ixbrl_fact_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"concept_qname" text NOT NULL,
	"context_ref" text DEFAULT 'c-1' NOT NULL,
	"fact_value" text NOT NULL,
	"unit_ref" text,
	"validated_ok" boolean DEFAULT false NOT NULL,
	"validation_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ixbrl_fact_drafts_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action
);
