/**
 * Phase 0 sync: pulls contacts + opportunities from GHL and upserts them into
 * Postgres by `ghl_id`. Read-only from GHL's perspective — never writes back.
 * Runs standalone (`npm run sync`) or from the Vercel Cron route handler.
 */
import "dotenv/config";
import { GhlClient, type GhlContact, type GhlOpportunity } from "@/lib/ghl/client";
import { db } from "@/lib/db";
import { contacts, opportunities, pipelineEvents, pipelineStages, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { classifyStageEvent } from "@/lib/pipeline-events/classify";

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

  let contactCount = 0;
  for await (const contact of client.iterateContacts()) {
    const { ghlId, ...update } = contactRow(contact);
    await db
      .insert(contacts)
      .values({ ghlId, ...update })
      .onConflictDoUpdate({ target: contacts.ghlId, set: update });
    contactCount++;
  }

  let opportunityCount = 0;
  let eventCount = 0;
  for await (const opp of client.iterateOpportunities()) {
    const { ghlId, ...update } = opportunityRow(opp, pipelineNames, stageNames, userNames);

    // Poll-diff pipeline event tracking (see drizzle/schema.ts pipelineEvents
    // doc comment): GHL doesn't hand us stage-change history, so we detect
    // it ourselves by comparing against what we last synced, before that
    // row gets overwritten below.
    const [existing] = await db
      .select({
        stageId: opportunities.stageId,
        stageName: opportunities.stageName,
        status: opportunities.status,
      })
      .from(opportunities)
      .where(eq(opportunities.ghlId, ghlId))
      .limit(1);

    await db
      .insert(opportunities)
      .values({ ghlId, ...update })
      .onConflictDoUpdate({ target: opportunities.ghlId, set: update });
    opportunityCount++;

    const stageChanged = update.stageId != null && update.stageId !== existing?.stageId;
    if (stageChanged) {
      const occurredAt = opp.lastStageChangeAt
        ? new Date(opp.lastStageChangeAt)
        : opp.updatedAt
          ? new Date(opp.updatedAt)
          : new Date();
      await db.insert(pipelineEvents).values({
        opportunityGhlId: ghlId,
        fromStageId: existing?.stageId ?? null,
        fromStageName: existing?.stageName ?? null,
        toStageId: update.stageId,
        toStageName: update.stageName,
        eventType: classifyStageEvent({
          fromStageName: existing?.stageName ?? null,
          fromStatus: existing?.status ?? null,
          toStageName: update.stageName,
          toStatus: update.status,
        }),
        occurredAt,
        source: "poll_diff",
        raw: opp,
      });
      eventCount++;
    }
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
