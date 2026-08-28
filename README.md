# RG Lead & Pipeline Manager

Internal management-intelligence layer on top of RG Investment Group's GoHighLevel (GHL) CRM. Build plan and phased roadmap: `/Users/titusneyland/.claude/plans/rg-lead-pipeline-partitioned-pie.md`.

Stack: Next.js (App Router, TypeScript) + Postgres (Neon) + Drizzle ORM + Tailwind/shadcn, deployed to Vercel.

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — from your Neon project
   - `GHL_PRIVATE_INTEGRATION_TOKEN` — RG's GHL account, Settings -> Private Integrations
   - `GHL_LOCATION_ID` — RG's GHL account, Settings -> Business Profile
2. Push the schema to Postgres:
   ```bash
   npm run db:push
   ```
3. Run the discovery script first — dumps real pipelines/stages and one raw contact + opportunity from RG's account, so field names can be checked against what `drizzle/schema.ts` and `lib/ghl/client.ts` assume before trusting a full sync:
   ```bash
   npm run discover
   ```
4. Run a real sync:
   ```bash
   npm run sync
   ```
5. Start the app:
   ```bash
   npm run dev
   ```
   Visit `/leads` for the walking-skeleton opportunities table.

## Scripts

- `npm run dev` / `build` / `start` — Next.js app
- `npm run discover` — dump raw GHL payloads for schema/field verification
- `npm run sync` — one-off sync of pipelines, contacts + opportunities into Postgres
- `npm run import:campaigns -- <file.csv>` — load campaign delivery numbers (see below)
- `npm run db:push` / `db:generate` / `db:studio` — Drizzle schema management

## Campaign reporting

The `/campaigns` report joins two different sources:

- **Delivery numbers** (records loaded, sent, delivered, failed, replies,
  DNC, wrong numbers, spend) come from RG's SMS/dialer tool. **GHL does not
  have this data and it cannot be synced** — import it with
  `npm run import:campaigns -- campaigns.csv`. See `campaigns.example.csv`
  for the expected columns; rows upsert on `key`, so re-importing an updated
  export refreshes rather than duplicates.
- **Pipeline results** (qualified, appointments, offers, contracts, revenue)
  are computed live from attributed opportunities — never stored, so they
  can't drift from the pipeline.

The two are linked by attribution: a campaign's `key` or `name` is matched
against each lead's GHL source, tags, and UTM campaign values
(`lib/campaigns/attribution.ts`). Leads that match nothing are reported as
"Unattributed" rather than dropped. **If RG doesn't stamp a recognizable
campaign name onto leads at send time, no attribution is possible** — that's
an operational fix (consistent source/tag naming), not a code one.

In production (Vercel), the sync runs on a schedule via `/api/cron/sync` (see `vercel.json`), authenticated with the `CRON_SECRET` env var that Vercel Cron sends automatically.
