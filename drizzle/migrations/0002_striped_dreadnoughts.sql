CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"channel" text DEFAULT 'sms' NOT NULL,
	"list_name" text,
	"market" text,
	"started_on" timestamp with time zone,
	"records_loaded" integer,
	"messages_sent" integer,
	"delivered" integer,
	"failed" integer,
	"replies" integer,
	"positive_replies" integer,
	"negative_replies" integer,
	"dnc_requests" integer,
	"wrong_numbers" integer,
	"cost_cents" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "source" text;