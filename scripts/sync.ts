/**
 * Phase 0 sync: pulls contacts + opportunities from GHL and upserts them into
 * Postgres by `ghl_id`. Read-only from GHL's perspective — never writes back.
 * Runs standalone (`npm run sync`) or from the Vercel Cron route handler.
 */
import "dotenv/config";
import { GhlClient, type GhlContact, type GhlOpportunity } from "@/lib/ghl/client";
import { db } from "@/lib/db";
import { contacts, opportunities, pipelineEvents, pipelineStages, users } from "@/drizzle/schema";
import { getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { classifyStageEvent } from "@/lib/pipeline-events/classify";

/** Rows per statement. Keeps each request well inside Neon's payload limits. */
const BATCH_SIZE = 500;

/**
 * Upserts in batches instead of one statement per row.
 *
 * The original loop issued a round trip per record, which against a real GHL
 * account (9,000+ contacts) ran for over ten minutes. That is not merely slow:
 * app/api/cron/sync/route.ts caps at 60 seconds, so the SCHEDULED sync could
 * never finish — it would time out partway through contacts and never reach
 * opportunities, meaning the deployed app would silently never see a deal.
 *
 * `excluded` refers to the row Postgres was about to insert, so conflicting
 * rows take the incoming values.
 */
async function batchUpsert<T extends PgTable>(
  table: T,
  rows: Record<string, unknown>[],
  conflictColumn: unknown,
  updateKeys: string[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const columns = getTableColumns(table) as Record<string, { name: string }>;
  const set = Object.fromEntries(
    updateKeys.map((key) => [key, sql.raw(`excluded."${columns[key].name}"`)])
  );

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db
      .insert(table)
      .values(rows.slice(i, i + BATCH_SIZE) as never)
      .onConflictDoUpdate({ target: conflictColumn as never, set: set as never });
  }
  return rows.length;
}

function contactRow(c: GhlContact) {
  return {
    ghlId: c.id,
    name:
      [c.firstName, c.lastName].filter(Boolean).join(" ") ||
      (c.name as string | undefined) ||
      (c.contactName as string | undefined) ||
      null,
    email: c.email ?? null,
    phone: (c.phone as string | undefined) ?? null,
    raw: c,
    syncedAt: new Date(),
  };
}

function opportunityRow(
  o: GhlOpportunity,
  pipelineNames: Map<string, string>,
  stageNames: Map<string, string>,
  userNames: Map<string, string>
) {
  return {
    ghlId: o.id,
    contactGhlId: o.contactId ?? null,
    name: o.name ?? null,
    pipelineId: o.pipelineId ?? null,
    pipelineName: o.pipelineId ? pipelineNames.get(o.pipelineId) ?? null : null,
    stageId: o.pipelineStageId ?? null,
    stageName: o.pipelineStageId ? stageNames.get(o.pipelineStageId) ?? null : null,
    status: o.status ?? null,
    ownerGhlId: o.assignedTo ?? null,
    ownerName: o.assignedTo ? userNames.get(o.assignedTo) ?? null : null,
    source: o.source ?? null,
    monetaryValue: o.monetaryValue != null ? String(o.monetaryValue) : null,
    raw: o,
    ghlCreatedAt: o.createdAt ? new Date(o.createdAt) : null,
    ghlUpdatedAt: o.updatedAt ? new Date(o.updatedAt) : null,
    syncedAt: new Date(),
  };
}

async function main() {
  const client = new GhlClient();

  const pipelines = await client.listPipelines();
  const pipelineNames = new Map(pipelines.map((p) => [p.id, p.name]));
  const stageNames = new Map(
    pipelines.flatMap((p) => p.stages.map((s) => [s.id, s.name] as const))
  );

  const ghlUsers = await client.listUsers();
  const userNames = new Map<string, string>();
  let userCount = 0;
  for (const u of ghlUsers) {
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email || null;
    if (name) userNames.set(u.id, name);
    // teamRole is intentionally NOT set here — GHL has no job-function
    // concept, so a re-sync must never clobber what RG set via
    // `npm run import:team`. New users default to "unassigned".
    const update = {
      name,
      email: u.email ?? null,
      phone: u.phone ?? null,
      ghlRole: u.roles?.role ?? null,
      raw: u as unknown as Record<string, unknown>,
      syncedAt: new Date(),
    };
    await db
      .insert(users)
      .values({ ghlId: u.id, ...update })
      .onConflictDoUpdate({ target: users.ghlId, set: update });
    userCount++;
  }

  let stageCount = 0;
  for (const pipeline of pipelines) {
    for (const [position, stage] of pipeline.stages.entries()) {
      const stageRow = {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        stageName: stage.name,
        position,
        syncedAt: new Date(),
      };
      await db
        .insert(pipelineStages)
        .values({ stageId: stage.id, ...stageRow })
        .onConflictDoUpdate({ target: pipelineStages.stageId, set: stageRow });
      stageCount++;
    }
  }

  const contactRows: Record<string, unknown>[] = [];
  for await (const contact of client.iterateContacts()) contactRows.push(contactRow(contact));
  const contactCount = await batchUpsert(contacts, contactRows, contacts.ghlId, [
    "name", "email", "phone", "raw", "syncedAt",
  ]);

  // Prior stage state for every opportunity in ONE query. Poll-diff needs to
  // compare against what we last stored, and doing that per row was the other
  // round trip making the sync unusable.
  const previous = new Map(
    (
      await db
        .select({
          ghlId: opportunities.ghlId,
          stageId: opportunities.stageId,
          stageName: opportunities.stageName,
          status: opportunities.status,
        })
        .from(opportunities)
    ).map((row) => [row.ghlId, row])
  );

  const opportunityRows: Record<string, unknown>[] = [];
  const eventRows: Record<string, unknown>[] = [];

  for await (const opp of client.iterateOpportunities()) {
    const row = opportunityRow(opp, pipelineNames, stageNames, userNames);
    opportunityRows.push(row);

    const existing = previous.get(row.ghlId);
    if (row.stageId != null && row.stageId !== existing?.stageId) {
      eventRows.push({
        opportunityGhlId: row.ghlId,
        fromStageId: existing?.stageId ?? null,
        fromStageName: existing?.stageName ?? null,
        toStageId: row.stageId,
        toStageName: row.stageName,
        eventType: classifyStageEvent({
          fromStageName: existing?.stageName ?? null,
          fromStatus: existing?.status ?? null,
          toStageName: row.stageName,
          toStatus: row.status,
        }),
        occurredAt: opp.lastStageChangeAt
          ? new Date(opp.lastStageChangeAt)
          : opp.updatedAt
            ? new Date(opp.updatedAt)
            : new Date(),
        source: "poll_diff",
        raw: opp,
      });
    }
  }

  const opportunityCount = await batchUpsert(
    opportunities,
    opportunityRows,
    opportunities.ghlId,
    ["contactGhlId","name","pipelineId","pipelineName","stageId","stageName","status",
     "ownerGhlId","ownerName","source","monetaryValue","raw","ghlCreatedAt","ghlUpdatedAt","syncedAt"]
  );

  let eventCount = 0;
  for (let i = 0; i < eventRows.length; i += BATCH_SIZE) {
    await db.insert(pipelineEvents).values(eventRows.slice(i, i + BATCH_SIZE) as never);
    eventCount += Math.min(BATCH_SIZE, eventRows.length - i);
  }

  console.log(
    `Synced ${userCount} users, ${stageCount} pipeline stages, ${contactCount} contacts, ${opportunityCount} opportunities, ${eventCount} pipeline events.`
  );
  return { userCount, stageCount, contactCount, opportunityCount, eventCount };
}

// Only auto-run when executed directly (`npm run sync`), not when imported
// by the cron route handler.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { main as runSync };
