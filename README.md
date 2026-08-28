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

## AI layer

Open any lead from the pipeline table to see it. The page is split
deliberately:

- **Computed facts** — days since update, days in stage, stage history,
  open flags. Plain code (`lib/rules`, `lib/pipeline-events`). A model is
  never asked to count or measure, so it can't get arithmetic wrong.
- **AI read / acquisition brief** — summary, seller motivation, price
  objections, still-interested, recommended follow-up. The only place
  judgment is used.

**Currently returns placeholders and calls no model.** Everything is
labeled "Placeholder" on screen, because invented motivation reads are
indistinguishable from real ones once rendered and a rep would act on
them.

To switch it on, set `AI_PROVIDER=openai` and `OPENAI_API_KEY` (both are
required — a stray key alone won't start billing). `lib/ai/openai-provider.ts`
is written but **unverified against the live API**; confirm one lead
parses before trusting it, and check `OPENAI_MODEL` names a model your
account can use.

**It will still be of limited use until GHL conversations are synced.**
There are no seller messages to read, so every judgment field correctly
reports "unknown" rather than guessing from pipeline stage. That sync is
the same missing piece blocking response time on `/team`. When it lands,
fill in `conversation` and `conversationsAvailable` in
`lib/ai/context.ts` — nothing else in the AI layer changes.

## Deploying

There are two deployments, and they are not equivalent.

### Vercel — the real app

Everything works: live GHL data, the scheduled sync, and the webhook
receiver.

1. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
   Next.js is auto-detected — accept the defaults and deploy.
2. It builds and serves correctly with **no environment variables set**,
   falling back to mock data (`lib/load-pipeline-data.ts`), so you can
   confirm the UI works before wiring up credentials.
3. Add the vars from `.env.example` under **Settings → Environment
   Variables**, redeploy, then run a sync.

Every push to `main` redeploys automatically once the project is linked.

### GitHub Pages — a static demo only

`.github/workflows/pages.yml` publishes a **frozen snapshot rendered from
mock data**. Enable it under **Settings → Pages → Source: GitHub Actions**
(not "Deploy from a branch" — that serves this README).

Pages serves static files, so the demo permanently cannot:

- show live GHL data (every page is prerendered at build time),
- run `/api/cron/sync` or `/api/webhooks/ghl` (both are stripped),
- read the database — adding credentials changes nothing there.

`scripts/prepare-static-demo.mjs` removes the API routes, converts
`force-dynamic` pages to `force-static`, and swaps the server `redirect()`
at `/` for a client-side one. It rewrites files in place and runs only in
CI, against a throwaway checkout.

Use it to show people the interface. Use Vercel for anything real.

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
