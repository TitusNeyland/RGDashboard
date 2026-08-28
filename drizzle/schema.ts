import {
  pgTable,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Mirrors a GHL contact. Typed columns cover what the dashboard needs today;
 * everything else stays in `raw` until a feature actually needs it promoted.
 */
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ghlId: text("ghl_id").notNull().unique(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  raw: jsonb("raw").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Mirrors a GHL opportunity (a lead's position in a pipeline).
 * `stage` / `pipelineId` etc. are promoted columns for querying;
 * `raw` keeps the full GHL payload for fields not yet modeled.
 */
export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  ghlId: text("ghl_id").notNull().unique(),
  contactGhlId: text("contact_ghl_id"),
  name: text("name"),
  pipelineId: text("pipeline_id"),
  pipelineName: text("pipeline_name"),
  stageId: text("stage_id"),
  stageName: text("stage_name"),
  status: text("status"),
  ownerGhlId: text("owner_ghl_id"),
  ownerName: text("owner_name"),
  /** GHL's free-text lead source — the primary campaign-attribution signal. */
  source: text("source"),
  monetaryValue: numeric("monetary_value"),
  raw: jsonb("raw").notNull(),
  ghlCreatedAt: timestamp("ghl_created_at", { withTimezone: true }),
  ghlUpdatedAt: timestamp("ghl_updated_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A marketing campaign (an SMS blast, a cold-call list, etc.) and its
 * delivery-side numbers.
 *
 * IMPORTANT — where this data comes from: everything from `recordsLoaded`
 * through `costCents` describes what happened inside RG's *sending* tool
 * (the SMS blaster / dialer), which this app does not integrate with. None
 * of it is or can be synced from GHL — GHL knows a conversation happened,
 * not that a 3,000-record list was loaded or what it cost. So these columns
 * are entered by RG, via `npm run import:campaigns` (CSV) or by hand.
 *
 * The *pipeline* side of a campaign's performance (interested / qualified /
 * appointments / offers / contracts / revenue) is NOT stored here — it is
 * computed live from attributed opportunities in lib/campaigns/report.ts,
 * so it can never drift from the pipeline data.
 *
 * `key` is the join to the pipeline: it is matched against an opportunity's
 * lead source / tags / UTM campaign — see lib/campaigns/attribution.ts.
 */
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  channel: text("channel", { enum: ["sms", "cold_call", "direct_mail", "other"] })
    .notNull()
    .default("sms"),
  /** The list this campaign pulled from, for list-vs-list comparison. */
  listName: text("list_name"),
  /** Market / ZIP label, for the doc's eventual ZIP-vs-ZIP comparison. */
  market: text("market"),
  startedOn: timestamp("started_on", { withTimezone: true }),

  // --- Delivery metrics (manual / CSV import — never synced) ---
  recordsLoaded: integer("records_loaded"),
  messagesSent: integer("messages_sent"),
  delivered: integer("delivered"),
  failed: integer("failed"),
  replies: integer("replies"),
  positiveReplies: integer("positive_replies"),
  negativeReplies: integer("negative_replies"),
  dncRequests: integer("dnc_requests"),
  wrongNumbers: integer("wrong_numbers"),
  /** Total spend in cents, so cost-per-X math never touches floats. */
  costCents: integer("cost_cents"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A pipeline's stages in their real GHL order — needed for stage-conversion
 * and bottleneck reporting (drizzle/schema.ts's other tables only knew each
 * opportunity's *current* stage name, not where that stage sits in the
 * funnel). Synced fresh from GHL's pipelines endpoint every run.
 */
export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: text("pipeline_id").notNull(),
  pipelineName: text("pipeline_name"),
  stageId: text("stage_id").notNull().unique(),
  stageName: text("stage_name"),
  position: integer("position").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * RG's own history of pipeline movement — GHL doesn't expose this natively
 * (its API returns current state, not an audit trail), so this is built up
 * one row at a time: either from a GHL webhook (source "webhook", real-time,
 * but unverified against a real GHL account until the Phase 1 spike from the
 * build plan is run), or inferred by diffing an opportunity's stored stage
 * against its newly-synced stage on every poll (source "poll_diff", always
 * on, resolution bounded by the sync interval). `actorGhlId` is populated
 * only when the source actually reports who acted — GHL's own
 * OpportunityStageUpdate webhook payload does not, so this is usually null;
 * see lib/rules/lead-rules.ts and the plan's employee-attribution risk note.
 */
export const pipelineEvents = pgTable("pipeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityGhlId: text("opportunity_ghl_id").notNull(),
  fromStageId: text("from_stage_id"),
  fromStageName: text("from_stage_name"),
  toStageId: text("to_stage_id"),
  toStageName: text("to_stage_name"),
  eventType: text("event_type", {
    enum: ["stage_change", "offer", "contract", "lost", "reactivation"],
  })
    .notNull()
    .default("stage_change"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  source: text("source", { enum: ["webhook", "poll_diff"] }).notNull(),
  actorGhlId: text("actor_ghl_id"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
