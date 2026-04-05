CREATE TABLE "funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ticker" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
