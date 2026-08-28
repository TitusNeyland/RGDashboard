CREATE TABLE "sync_state" (
	"entity" text PRIMARY KEY NOT NULL,
	"last_record_at" timestamp with time zone,
	"last_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_run_count" integer DEFAULT 0 NOT NULL
);
