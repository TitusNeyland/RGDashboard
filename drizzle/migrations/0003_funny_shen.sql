CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ghl_id" text NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"ghl_role" text,
	"team_role" text DEFAULT 'unassigned' NOT NULL,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_ghl_id_unique" UNIQUE("ghl_id")
);
