CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" text NOT NULL,
	"pipeline_name" text,
	"stage_id" text NOT NULL,
	"stage_name" text,
	"position" integer NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stages_stage_id_unique" UNIQUE("stage_id")
);
