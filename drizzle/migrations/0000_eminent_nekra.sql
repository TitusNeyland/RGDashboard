CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ghl_id" text NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_ghl_id_unique" UNIQUE("ghl_id")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ghl_id" text NOT NULL,
	"contact_ghl_id" text,
	"name" text,
	"pipeline_id" text,
	"pipeline_name" text,
	"stage_id" text,
	"stage_name" text,
	"status" text,
	"owner_ghl_id" text,
	"owner_name" text,
	"monetary_value" numeric,
	"raw" jsonb NOT NULL,
	"ghl_created_at" timestamp with time zone,
	"ghl_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_ghl_id_unique" UNIQUE("ghl_id")
);
--> statement-breakpoint
CREATE TABLE "pipeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_ghl_id" text NOT NULL,
	"from_stage_id" text,
	"from_stage_name" text,
	"to_stage_id" text,
	"to_stage_name" text,
	"event_type" text DEFAULT 'stage_change' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"actor_ghl_id" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
