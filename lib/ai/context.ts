import type { opportunities, pipelineEvents } from "@/drizzle/schema";
import { evaluateLeadRules } from "@/lib/rules/lead-rules";
import type { contacts } from "@/drizzle/schema";
import type { LeadContext } from "@/lib/ai/types";

type OpportunityRow = typeof opportunities.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Assembles what the model gets to see.
 *
 * Everything under `facts` is computed here, in ordinary code, and handed
 * to the model as settled truth — the spec's rule that time since contact,
 * stage duration and the like are not AI work. The model's only job is
 * reading conversation text and forming a judgment.
 *
 * `conversation` is empty and `conversationsAvailable` is false because
 * this app does not sync GHL conversations yet. When that sync lands, fill
 * both in here and nothing else in the AI layer needs to change.
 */
export function buildLeadContext(
  opportunity: OpportunityRow,
  events: PipelineEventRow[],
  allOpportunities: OpportunityRow[],
  allContacts: ContactRow[]
): LeadContext {
  const own = events
    .filter((e) => e.opportunityGhlId === opportunity.ghlId)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const stageHistory = own
    .filter((e) => e.toStageName != null)
    .map((e) => ({ stage: e.toStageName!, enteredAt: e.occurredAt }));

  const enteredCurrentStage = own.length > 0 ? own[own.length - 1].occurredAt : null;

  const flags = evaluateLeadRules(allOpportunities, allContacts, events).filter(
    (f) => f.opportunityId === opportunity.id
  );

  return {
    leadName: opportunity.name ?? "Unnamed lead",
    stageName: opportunity.stageName,
    pipelineName: opportunity.pipelineName,
    status: opportunity.status,
    ownerName: opportunity.ownerName,
    source: opportunity.source,
    monetaryValue: opportunity.monetaryValue,
    facts: {
      daysSinceLastUpdate: daysSince(opportunity.ghlUpdatedAt),
      daysInCurrentStage: daysSince(enteredCurrentStage),
      stageHistory,
      openFlags: flags.map((f) => ({ what: f.whatIsWrong, priority: f.priority })),
    },
    conversation: [],
    conversationsAvailable: false,
  };
}
