import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { opportunities, pipelineEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { classifyStageEvent } from "@/lib/pipeline-events/classify";
import { GhlClient } from "@/lib/ghl/client";

export const dynamic = "force-dynamic";

/**
 * Receives GHL Workflow webhook actions for real-time pipeline events —
 * see drizzle/schema.ts pipelineEvents doc comment. UNVERIFIED against a
 * real GHL account: this shape matches GHL's public OpportunityStageUpdate
 * webhook docs (github.com/GoHighLevel/highlevel-api-docs), not a live test.
 * Run the Phase 1 spike from the build plan (a real Workflow -> webhook
 * pointed at this route) before relying on it — until then, `npm run sync`'s
 * poll-diff path is the event source of record.
 *
 * Configure the secret as a query param on the webhook URL in GHL's
 * Workflow builder: https://.../api/webhooks/ghl?secret=...
 */
interface OpportunityStageUpdatePayload {
  type?: string;
  locationId?: string;
  id?: string;
  assignedTo?: string;
  contactId?: string;
  monetaryValue?: number;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  dateAdded?: string;
}

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.GHL_WEBHOOK_SECRET || secret !== process.env.GHL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as OpportunityStageUpdatePayload | null;
  if (!payload?.id || !payload.pipelineStageId) {
    // Not a stage-update event (or an unrecognized shape) — acknowledge
    // without processing so GHL doesn't retry a type we don't handle yet.
    return NextResponse.json({ skipped: true });
  }

  const [existing] = await db
    .select({
      stageId: opportunities.stageId,
      stageName: opportunities.stageName,
      status: opportunities.status,
    })
    .from(opportunities)
    .where(eq(opportunities.ghlId, payload.id))
    .limit(1);

  if (existing?.stageId === payload.pipelineStageId) {
    return NextResponse.json({ skipped: true, reason: "no stage change" });
  }

  let toStageName: string | null = null;
  try {
    const client = new GhlClient();
    const pipelines = await client.listPipelines();
    const stage = pipelines
      .flatMap((p) => p.stages)
      .find((s) => s.id === payload.pipelineStageId);
    toStageName = stage?.name ?? null;
  } catch {
    // Best-effort — the next full sync will backfill stageName either way.
  }

  await db
    .update(opportunities)
    .set({
      stageId: payload.pipelineStageId,
      stageName: toStageName,
      status: payload.status ?? undefined,
      monetaryValue: payload.monetaryValue != null ? String(payload.monetaryValue) : undefined,
      ownerGhlId: payload.assignedTo ?? undefined,
      syncedAt: new Date(),
    })
    .where(eq(opportunities.ghlId, payload.id));

  await db.insert(pipelineEvents).values({
    opportunityGhlId: payload.id,
    fromStageId: existing?.stageId ?? null,
    fromStageName: existing?.stageName ?? null,
    toStageId: payload.pipelineStageId,
    toStageName,
    eventType: classifyStageEvent({
      fromStageName: existing?.stageName ?? null,
      fromStatus: existing?.status ?? null,
      toStageName,
      toStatus: payload.status ?? null,
    }),
    occurredAt: payload.dateAdded ? new Date(payload.dateAdded) : new Date(),
    source: "webhook",
    // No actor field — GHL's OpportunityStageUpdate payload only reports
    // the opportunity's current assignee, not who made this change.
    actorGhlId: null,
    raw: payload as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ recorded: true });
}
