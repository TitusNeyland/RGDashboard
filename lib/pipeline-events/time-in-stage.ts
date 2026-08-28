import type { pipelineEvents } from "@/drizzle/schema";

type PipelineEventRow = typeof pipelineEvents.$inferSelect;

/** Opportunity ghlId -> when it entered its current (most recent) stage. */
export function latestStageEntryByOpportunity(events: PipelineEventRow[]) {
  const map = new Map<string, Date>();
  const sorted = [...events].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  for (const e of sorted) {
    if (!map.has(e.opportunityGhlId)) map.set(e.opportunityGhlId, e.occurredAt);
  }
  return map;
}
