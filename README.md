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
- `npm run import:team -- <file.csv>` — assign job-function roles to users (see below)
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

## Team roles

`npm run sync` pulls RG's employees from GHL, but GHL only records a
permission level (`admin` / `user`) — it has no concept of cold caller vs
VA vs acquisitions. That classification is RG's own, so set it with:

```bash
npm run import:team -- team.csv
```

See `team.example.csv`. Users are matched by email (or `ghl_id`) and must
already be synced; `sync` never overwrites `team_role`, so re-syncing is
safe. Anyone not in the file shows under "Unassigned role" rather than
being hidden.

**Attribution caveat:** `/team` credits whoever *currently owns* a lead,
not whoever did the work. GHL reports an opportunity's assignee but never
the user behind a stage change (`pipeline_events.actor_ghl_id` is
effectively always null), so a reassigned lead carries its full history to
its new owner. These are workload-and-outcome-per-owner figures, not
individual performance scores.

## Deploying

**This app cannot be hosted on GitHub Pages.** Pages serves static files
only, and every page here is server-rendered per request (`force-dynamic`),
queries Postgres server-side, and ships API routes (`/api/cron/sync`,
`/api/webhooks/ghl`). If Pages is enabled on the repo it will just render
this README — turn it off under **Settings → Pages → Source: None**.

Deploy to **Vercel** instead:

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `TitusNeyland/RGDashboard`. Next.js is auto-detected — accept the
   defaults and deploy.
2. It will build and serve correctly with **no environment variables set**,
   falling back to mock data (see `lib/load-pipeline-data.ts`), so you can
   confirm the real UI works before wiring up credentials.
3. Add the env vars from `.env.example` under **Settings → Environment
   Variables** when ready, then redeploy and run a sync.

Every push to `main` redeploys automatically once the project is linked.

### Cron frequency

`vercel.json` schedules the sync daily (`0 9 * * *`) because **Vercel's free
Hobby plan rejects any cron more frequent than once a day** — a deployment
with e.g. `*/30 * * * *` fails with "Hobby accounts are limited to daily
cron jobs."

This has a real consequence for pipeline event tracking: poll-diff detection
only sees stage changes as often as the sync runs, so on a daily schedule
several moves within one day collapse into one recorded event. On a Pro
plan, change the schedule to `*/30 * * * *` for near-real-time history — or
configure the GHL webhook (`/api/webhooks/ghl`), which captures changes as
they happen regardless of cron frequency.
